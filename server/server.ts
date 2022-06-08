"use strict";
import express from "express";
import morgan from "morgan";
import "dotenv/config";
import { getMentorReq, createStackChannels } from "./handler";
const PORT = process.env.PORT || 4000;

express()
  .use(function (req, res, next) {
    res.header(
      "Access-Control-Allow-Methods",
      "OPTIONS, HEAD, GET, PUT, POST, DELETE"
    );
    res.header(
      "Access-Control-Allow-Headers",
      "Origin, X-Requested-With, Content-Type, Accept"
    );
    next();
  })
  .use(morgan("tiny"))
  .use(express.static("./server/assets"))
  .use(express.json())
  .use(express.urlencoded({ extended: false }))
  .use("/", express.static(__dirname + "/"))

  // REST endpoints?
  .get("/get-mentor-request", getMentorReq)
  .get("/create-stack-channels", createStackChannels)
  .get("/ping", (req, res) => res.status(200).json("I'm alive"))
  .listen(PORT, () => console.info(`Listening on port ${PORT}`));
