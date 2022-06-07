import axios from "axios";
import { Request, Response } from "express";
import { createPayload } from "./payload";
import "dotenv/config";
const { EXERCISM_TOKEN, SLACK_BOT_TOKEN } = process.env;
const CONFIG = {
  headers: { Authorization: `Bearer ${EXERCISM_TOKEN}` },
};
interface Track {
  slug: string;
  title: string;
  icon_url: string;
  num_solutions_queued: number;
  median_wait_time: number;
  links: {
    exercises: string;
  };
}
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
const postMsgToSlack = async (slug: string, students: any[]) => {
  students.forEach(async (student) => {
    const payload = createPayload(slug, student);
    await axios
      .post("https://slack.com/api/chat.postMessage", JSON.stringify(payload), {
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Content-Length": new TextEncoder().encode(JSON.stringify(payload))
            .length,
          Authorization: `Bearer ${SLACK_BOT_TOKEN}`,
          Accept: "application/json",
        },
      })
      .then((res) => res)
      .catch((err) => {
        console.log("ERROR = ", err);
      });
  });
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
              name: slug,
              channels: "write",
            }),
            {
              headers: {
                "Content-Type": "application/json; charset=utf-8",
                "Content-Length": new TextEncoder().encode(
                  JSON.stringify({
                    name: slug,
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
