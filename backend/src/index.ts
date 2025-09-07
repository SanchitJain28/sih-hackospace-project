import express, { Application, Request, Response } from "express";
import dotenv from "dotenv";
import router from "./api/routes/Spaceroute";
dotenv.config();
const app: Application = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(router);

app.get("/", (req: Request, res: Response) => {
  return res.json({
    status: true,
    message: "The SERVER IS ON AND RUNNING !!! ❤️",
  });
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
