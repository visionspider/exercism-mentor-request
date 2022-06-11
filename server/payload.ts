import { Student } from "./interface";

export const createPayload = (slug: string, student: Student) => {
  if (student) {
    const {
      track_title,
      exercise_icon_url,
      exercise_title,
      student_handle,
      student_avatar_url,
      url,
    } = student;

    return {
      channel: slug,
      attachments: [
        {
          color: "#00FF00",
          blocks: [
            {
              type: "section",
              text: {
                type: "mrkdwn",
                text: `*A Student needs help*`,
              },
            },
            {
              type: "section",
              text: {
                type: "mrkdwn",
                text: `<${url}|Click to help student>`,
              },
            },
            {
              type: "context",
              elements: [
                {
                  type: "image",
                  image_url: `${student_avatar_url}`,
                  alt_text: "images",
                },
                {
                  type: "mrkdwn",
                  text: `*Student:* ${student_handle}`,
                },
              ],
            },
            {
              type: "context",
              elements: [
                {
                  type: "image",
                  image_url: `${exercise_icon_url}?sanitize=true`,
                  alt_text: `exercise ${exercise_title} icon`,
                },
                {
                  type: "mrkdwn",
                  text: `*Exercise*: "${exercise_title}"`,
                },
              ],
            },
          ],
        },
      ],
    };
  }
};
