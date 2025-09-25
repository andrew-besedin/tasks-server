import express, { Router } from "express";
import path from 'path';
import { fileURLToPath } from "url";
import { JsonDB, Config } from 'node-json-db';
import multer from "multer";

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

const db = new JsonDB(new Config("db.json", true, false, '/'));

class Task {
  id: string | null;
  name: string;
  status: 0 | 1 | 2;
  fileNames: string[];
  constructor(params: any = {}) {
    this.id = params?.id || null;
    this.name = params?.name || "";
    this.status = params?.status || 0;
    this.fileNames = params?.fileNames || [];
  }
}

router.get("/tasks", async (req, res) => {
  const tasksObjs = await db.getObjectDefault("/tasks", []);

  const tasks = tasksObjs.map(task => new Task(task));

  res.status(200).send(tasks);
});

router.post("/tasks", async (req, res) => {
  const tasksObjs = await db.getObjectDefault("/tasks", []);

  const tasks = tasksObjs.map(task => new Task(task));

  tasks.push(new Task({
    id: (tasks.length + 1).toString(),
    name: req.body.taskName,
    status: 0,
    fileNames: [],
  }));

  await db.push("/tasks", tasks);

  res.status(201).send();
});

router.get("/task/:id", async (req, res) => {
  const taskId = req.params.id;
  const tasksObjs = await db.getObjectDefault("/tasks", []);

  const tasks = tasksObjs.map(task => new Task(task));

  const task = tasks.find(t => t.id === taskId);

  if (task) {
    res.status(200).send(task);
  } else {
    res.status(404).send("");
  }
});

router.patch("/task/:id/status", async (req, res) => {
  const taskId = req.params.id;
  const tasksObjs = await db.getObjectDefault("/tasks", []);

  const tasks = tasksObjs.map(task => new Task(task));

  const task = tasks.find(t => t.id === taskId);

  if (!task) {
    res.status(404).send("");
    return;
  }

  task.status = req.body.newStatus;
  await db.push("/tasks", tasks);
  res.status(200).send("");
});

router.post("/task/:id/uploaded-files", upload.array("attached-files"), async (req, res) => {
  const taskId = req.params.id;
  const tasksObjs = await db.getObjectDefault("/tasks", []);

  const tasks = tasksObjs.map(task => new Task(task));

  const task = tasks.find(t => t.id === taskId);

  if (!task) {
    res.status(404).send("");
    return; 
  }

  const uploadedFiles = (req.files as Express.Multer.File[]).map(file => file.filename);
  task.fileNames = [...task.fileNames, ...uploadedFiles];
  await db.push("/tasks", tasks);
  res.status(200).send("");
});

app.use("/api", router);

app.listen(PORT, () => console.log(`Server is listening port ${PORT}`));