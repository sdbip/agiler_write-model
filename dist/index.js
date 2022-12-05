#!/usr/bin/env node
var _a;
import express, { json, urlencoded, Router } from 'express';
import { createServer } from 'http';
const app = express();
app.use(json());
app.use(urlencoded({ extended: false }));
var router = Router();
router.get('/', (req, res) => {
    res.json({ message: 'alive', test: process.env.TEST });
});
app.use('/', router);
const port = (_a = process.env.PORT) !== null && _a !== void 0 ? _a : 80;
const server = createServer(app);
server.listen(port);
