import { ObjectId } from "mongodb";

export interface StudentRequest {
  _id?: ObjectId;
  uuid: string;
  timestamp?: number;
}

export interface DB_OPTIONS {
  useNewUrlParser: boolean;
  useUnifiedTopology: boolean;
}

export interface Track {
  slug: string;
  title: string;
  icon_url: string;
  num_solutions_queued: number;
  median_wait_time: number;
  links: {
    exercises: string;
  };
}

export interface Student {
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
