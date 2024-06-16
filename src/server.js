import express from "express";
import morgan from "morgan";


import dotenv from "dotenv";
dotenv.config();

const app=express();
const port=process.env.PORT;

app.use(morgan());
app.use(express.json());

app.use("/api/v1", appRouter);

app.listen(port,(err)=>{
    if (err) throw err;
    console.log(`Server is running on port ${port}`);
})