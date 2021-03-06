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
// const OPTIONS = {
//   useNewUrlParser: true,
//   useUnifiedTopology: true,
// };

const CLIENT: MongoClient = new MongoClient(MONGO_URI);

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
    console.log("LINE 37 ERROR = ", err);
  } finally {
  }
};
//Check with DB if Timestamp has passed threshold
export const checkTimestamp = (timestamp: number) => {
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

//Check with DB if UUID already exist
const checkUUID = async (student: Student, DB: Db) => {
  try {
    const uuid: string = student.uuid;
    // console.log("LINE 66 = ", uuid);
    const studentReq = await DB.collection(REQUEST).findOne({ uuid });
    const checkResults = { postMsg: false, type: "" };
    if (studentReq) {
      if (checkTimestamp(studentReq.ts)) {
        checkResults.postMsg = true;
        checkResults.type = "update";
        return checkResults;
      } else {
        return checkResults;
      }
    } else {
      checkResults.postMsg = true;
      checkResults.type = "create";

      return checkResults;
    }
  } catch (err) {
    console.log("LINE 84 ERROR = ", err);
  }
};
const addUUIDToDB = async (
  uuid: string,
  DB: Db,
  ts: number,
  channel: string
) => {
  return await DB.collection(REQUEST).insertOne({
    uuid,
    ts,
    channel,
  });
};

const updateUUID = async (
  uuid: string,
  DB: Db,
  ts: number,
  channel: string
) => {
  await deleteSlackMsg(channel, ts + "");
  return await DB.collection(REQUEST).updateOne({ uuid }, { $set: { ts } });
};

const deleteSlackMsg = async (channel: string, ts: string) => {
  try {
    const response = await axios
      .post(
        "https://slack.com/api/chat.delete",
        JSON.stringify({ channel, ts }),
        {
          headers: {
            "Content-Type": "application/json; charset=utf-8",
            "Content-Length": new TextEncoder().encode(
              JSON.stringify({ channel, ts })
            ).length,
            Authorization: `Bearer ${SLACK_BOT_TOKEN}`,
            Accept: "application/json",
          },
        }
      )
      .then((res) => res)
      .catch((err) => {
        console.log("LINE 114 ERROR = ", err);
      });
    console.log(response);
  } catch (err) {
    console.log(err);
  }
};

//LOOP through
const removeUUID = async (students: any[], DB: Db) => {
  try {
    const reqList: any[] = await DB.collection(REQUEST).find().toArray();
    await Promise.all(
      reqList.map(async (studentReq: StudentRequest) => {
        const { uuid, channel, ts } = studentReq;
        if (!students.find((student) => student.uuid === uuid)) {
          await deleteSlackMsg(channel, ts + "");
          await DB.collection(REQUEST).deleteOne({ uuid });
        }
      })
    );
  } catch (err) {
    console.log("LINE 101 ERROR = ", err);
  }
};

const postMsgToSlack = async (slug: string, students: any[]) => {
  try {
    const DB: Db = CLIENT.db(DB_NAME);

    await removeUUID(students, DB);
    students.forEach(async (student) => {
      const checkResults = await checkUUID(student, DB);
      if (checkResults?.postMsg) {
        const payload = createPayload(slug, student);
        const result = await axios
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
            console.log("LINE 129 ERROR = ", err);
          });
        if (result?.data.ok) {
          const uuid: string = student.uuid;
          const { ts, channel } = result?.data;

          checkResults.type === "create"
            ? addUUIDToDB(uuid, DB, +ts * 1000, channel)
            : checkResults.type === "update"
            ? updateUUID(uuid, DB, +ts * 1000, channel)
            : null;
        }
      }
    });
  } catch (err) {
    console.log("LINE 134 ERROR = ", err);
  } finally {
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

    await CLIENT.connect();

    const result = await Promise.all(slugsList.map(checkMentorRequest));
    res.status(200).json({
      status: 200,
      message: "success",
      data: result,
    });
  } catch (err) {
    console.log("LINE 168 ERROR = ", err);
  } finally {
    CLIENT.close();
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
            console.log("LINE 200 ERROR = ", err);
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
    console.log("LINE 213 ERROR = ", err);
  } finally {
  }
};

export const testDeleteSlackMsg = async (req: Request, res: Response) => {
  try {
    const { body } = req;
    const response = await axios
      .post("https://slack.com/api/chat.delete", JSON.stringify(body), {
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Content-Length": new TextEncoder().encode(JSON.stringify(body))
            .length,
          Authorization: `Bearer ${SLACK_BOT_TOKEN}`,
          Accept: "application/json",
        },
      })
      .then((res) => res)
      .catch((err) => {
        console.log("LINE 129 ERROR = ", err);
      });
    console.log(response);
    res.status(200).json({
      status: 200,
      message: "success",
    });
  } catch (err) {
    console.log(err);
  }
};
export const testPostToSlack = async (req: Request, res: Response) => {
  const { slug, students }: { slug: string; students: any[] } = req.body;
  try {
    const result = Promise.all(
      students.map(async (student) => {
        const payload = createPayload(slug, student);
        const response = await axios
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
            console.log("LINE 129 ERROR = ", err);
          });
        console.log(response?.data);
      })
    );
    res.status(200).json({
      status: 200,
      message: "success",
      data: result,
    });
  } catch (err) {
    console.log(err);
  }
};
