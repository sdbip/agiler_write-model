#!/usr/bin/env node
import express, { json, urlencoded, Router } from 'express';
import { createServer } from 'http';

const app = express();

app.use(json());
app.use(urlencoded({ extended: false }));

var router = Router();
router.get('/', (req: unknown, res: any) => {
  res.json({message: 'alive', test: process.env.TEST});
});
app.use('/', router);

const port = process.env.PORT ?? 80
const server = createServer(app);
server.listen(port);
