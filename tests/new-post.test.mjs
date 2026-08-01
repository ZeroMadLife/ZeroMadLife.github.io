import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { createPost } from "../scripts/new-post.js";

test("new-post creates a fail-closed draft with the publication contract", (t) => {
	const directory = fs.mkdtempSync(path.join(os.tmpdir(), "blog-new-post-"));
	t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
	const target = createPost({
		args: ["agent-runtime-notes", "--title", "Agent Runtime 学习笔记"],
		targetDir: directory,
		now: new Date(2026, 7, 1),
	});
	const source = fs.readFileSync(target, "utf8");

	assert.equal(path.basename(target), "agent-runtime-notes.md");
	assert.match(source, /draft: true/);
	assert.match(source, /visibility: public/);
	assert.match(source, /publish: true/);
	assert.match(source, /published: 2026-08-01/);
});

test("new-post rejects traversal and refuses to overwrite an existing draft", (t) => {
	const directory = fs.mkdtempSync(path.join(os.tmpdir(), "blog-new-post-"));
	t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
	assert.throws(() => createPost({ args: ["../private"], targetDir: directory }), /路径字符/);
	createPost({ args: ["same-slug"], targetDir: directory });
	assert.throws(() => createPost({ args: ["same-slug"], targetDir: directory }), /EEXIST/);
});
