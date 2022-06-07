interface Student {
  uuid: string;
  track_title: string;
  exercise_icon_url: string;
  exercise_title: string;
  student_handle: string;
  student_avatar_url: string;
  updated_at: string;
  have_mentored_previously: boolean;
  is_favorited: boolean;
  status: null;
  tooltip_url: string;
  url: string;
}
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
                text: `*Student needs help in ${track_title}*`,
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
