import express, { Router } from "express";
import path from 'path';
import { fileURLToPath } from "url";
import multer from "multer";
import { initDatabase } from "./database";
import { Task, type TaskStatus } from "./models/Task";

const app = express();
const PORT = 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, "./uploads"));
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + "-" + file.originalname);
    }
});

const upload = multer({ storage });

app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use("/", express.static(path.join(__dirname, "static")));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const router = Router();

function parseTaskId(rawId: string) {
  const id = Number(rawId);
  return Number.isInteger(id) && id > 0 ? id : null;
}

router.get("/tasks", async (req, res) => {
  const tasks = await Task.findAll({ order: [["id", "ASC"]] });

  res.status(200).send(tasks);
});

router.post("/tasks", async (req, res) => {
  const taskName = typeof req.body.taskName === "string" ? req.body.taskName.trim() : "";

  if (!taskName) {
    res.status(400).send({ error: "Task name must not be empty" });
    return;
  }

  await Task.create({ name: taskName });

  res.status(201).send();
});

router.get("/task/:id", async (req, res) => {
  const taskId = parseTaskId(req.params.id);
  const task = taskId === null ? null : await Task.findByPk(taskId);

  if (task) {
    res.status(200).send(task);
  } else {
    res.status(404).send("");
  }
});

router.patch("/task/:id/status", async (req, res) => {
  const taskId = parseTaskId(req.params.id);
  const newStatus = Number(req.body.newStatus);

  if (![0, 1, 2].includes(newStatus)) {
    res.status(400).send({ error: "Status must be 0, 1 or 2" });
    return;
  }

  const task = taskId === null ? null : await Task.findByPk(taskId);

  if (!task) {
    res.status(404).send("");
    return;
  }

  task.status = newStatus as TaskStatus;
  await task.save();
  res.status(200).send("");
});

router.post("/task/:id/uploaded-files", upload.array("attached-files"), async (req, res) => {
  const taskId = parseTaskId(req.params.id);
  const task = taskId === null ? null : await Task.findByPk(taskId);

  if (!task) {
    res.status(404).send("");
    return;
  }

  const uploadedFiles = (req.files as Express.Multer.File[]).map(file => file.filename);
  task.fileNames = [...task.fileNames, ...uploadedFiles];
  await task.save();
  res.status(200).send("");
});

app.use("/api", router);

initDatabase()
  .then(() => app.listen(PORT, () => console.log(`Server is listening port ${PORT}`)))
  .catch((err) => {
    console.error("Failed to connect to the database", err);
    process.exit(1);
  });
