// External Dependencies
import axios from "axios";
import { Request, Response } from "express";
import { createPayload } from "./payload";
import { Student, StudentRequest, DB_OPTIONS, Track } from "./interface";
import { Db, MongoClient, ObjectId } from "mongodb";
import {
  DB_NAME,
  REQUEST,
  EXERCISM_TOKEN,
  MONGO_URI,
  SLACK_BOT_TOKEN,
} from "./config";

const CONFIG = {
  headers: { Authorization: `Bearer ${EXERCISM_TOKEN}` },
};
const OPTIONS = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
};

const CLIENT: MongoClient = new MongoClient(MONGO_URI, OPTIONS);
const DB: Db = CLIENT.db(DB_NAME);

const getTracksList = async () => {
  try {
    const getList = await axios
      .get("https://exercism.org/api/v2/mentoring/tracks", CONFIG)
      .then((res) => res)
      .catch((err) => err);
    if (getList.data) {
      const slugsList = getList.data.tracks.map((track: Track) => track.slug);
      return slugsList;
    }
  } catch (err) {
    console.log("ERROR = ", err);
  } finally {
  }
};
//Check with DB if Timestamp has passed threshold
const checkTimestamp = (timestamp: number) => {
  //MODIFY THE AMOUNT OF TIME IN MS TO CHANGE WHEN A STUDENT REQUEST NEEDS TO BE REPOSTED
  //(CURRENTLY 5 DAYS)
  const TIME_THRESHOLD: number = 432000000;
  const timePassedInMS: number = +new Date() - timestamp;
  if (timePassedInMS >= TIME_THRESHOLD) {
    return true;
  } else {
    return false;
  }
};

const addUUIDToDB = async (_id: string) => {
  const timestamp: number = +new Date();

  return await DB.collection(REQUEST).insertOne({
    _id: new ObjectId(_id),
    timestamp,
  });
};

//Check with DB if UUID already exist
const checkUUID = async (student: Student) => {
  try {
    const _id: string = student.uuid;
    const studentReq = await DB.collection(REQUEST).findOne({ _id });

    if (studentReq) {
      if (checkTimestamp(studentReq.timestamp)) {
        await DB.collection(REQUEST).updateOne(
          { _id },
          { $set: { timestamp: +new Date() } }
        );
        return true;
      } else {
        return false;
      }
    } else {
      const isAdded = addUUIDToDB(_id);
      return isAdded;
    }
  } catch (err) {
    console.log("ERROR = ", err);
  }
};

//LOOP through
const removeUUID = async (students: any[]) => {
  try {
    const reqList: any[] = await DB.collection(REQUEST).find().toArray();
    Promise.all(
      reqList.map(async (studentReq: StudentRequest) => {
        const { _id } = studentReq;
        if (!students.find((student) => student.uuid === _id)) {
          await DB.collection(REQUEST).deleteOne({ _id });
        }
      })
    );
  } catch (err) {
    console.log("ERROR = ", err);
  }
};

const postMsgToSlack = async (slug: string, students: any[]) => {
  await CLIENT.connect();
  try {
    await removeUUID(students);
    students.forEach(async (student) => {
      if (await checkUUID(student)) {
        const payload = createPayload(slug, student);
        await axios
          .post(
            "https://slack.com/api/chat.postMessage",
            JSON.stringify(payload),
            {
              headers: {
                "Content-Type": "application/json; charset=utf-8",
                "Content-Length": new TextEncoder().encode(
                  JSON.stringify(payload)
                ).length,
                Authorization: `Bearer ${SLACK_BOT_TOKEN}`,
                Accept: "application/json",
              },
            }
          )
          .then((res) => res)
          .catch((err) => {
            console.log("ERROR = ", err);
          });
      }
    });
  } catch (err) {
    console.log("ERROR = ", err);
  } finally {
    CLIENT.close();
  }
};

const checkMentorRequest = async (slug: string) => {
  const request = await axios
    .get(
      `https://exercism.org/api/v2/mentoring/requests?track_slug=${slug}`,
      CONFIG
    )
    .then((res) => res)
    .catch((err) => err);

  if (request.data.results.length > 0) {
    const results = request.data.results;
    postMsgToSlack(slug, results);
    return { slug, results };
  }
};

export const getMentorReq = async (req: Request, res: Response) => {
  try {
    const slugsList = await getTracksList();

    const result = await Promise.all(slugsList.map(checkMentorRequest));

    res.status(200).json({
      status: 200,
      message: "success",
      data: result,
    });
  } catch (err) {
    console.log("ERROR = ", err);
  } finally {
  }
};
export const createStackChannels = async (req: Request, res: Response) => {
  try {
    const slugsList = await getTracksList();
    const result = await Promise.all(
      slugsList.map(async (slug: string) => {
        const response = await axios
          .post(
            "https://slack.com/api/conversations.create",
            JSON.stringify({
              name: `notifications-mentoring-${slug}`,
              channels: "write",
            }),
            {
              headers: {
                "Content-Type": "application/json; charset=utf-8",
                "Content-Length": new TextEncoder().encode(
                  JSON.stringify({
                    name: `notifications-mentoring-${slug}`,
                    channels: "write",
                  })
                ).length,
                Authorization: `Bearer ${SLACK_BOT_TOKEN}`,
                Accept: "application/json",
              },
            }
          )
          .then((res) => res)
          .catch((err) => {
            console.log("ERROR = ", err);
          });

        return response?.data.channel;
      })
    );
    console.log(result);
    res.status(200).json({
      status: 200,
      message: "success",
      data: result,
    });
  } catch (err) {
    console.log("ERROR = ", err);
  } finally {
  }
};
