'use strict';

const mongoose = require('mongoose');
const { ObjectId } = mongoose.Types;

module.exports = function (app) {
  // Define schemas
  const replySchema = new mongoose.Schema({
    text: { type: String, required: true },
    created_on: { type: Date, default: new Date() },
    delete_password: { type: String, required: true },
    reported: { type: Boolean, default: false },
  });

  const threadSchema = new mongoose.Schema({
    board: { type: String, required: true },
    text: { type: String, required: true },
    created_on: { type: Date, default: new Date() },
    bumped_on: { type: Date, default: new Date() },
    reported: { type: Boolean, default: false },
    delete_password: { type: String, required: true },
    replies: [replySchema],
  });

  const Thread = mongoose.model('Thread', threadSchema);

  // POST /api/threads/:board - create new thread
  app.route('/api/threads/:board')
    .post(async (req, res) => {
      const board = req.params.board;
      const { text, delete_password } = req.body;

      try {
        const thread = new Thread({
          board,
          text,
          delete_password,
          created_on: new Date(),
          bumped_on: new Date(),
          reported: false,
          replies: [],
        });

        await thread.save();

        return res.redirect(`/b/${board}/`);
      } catch (err) {
        console.error(err);
        return res.status(500).send('Server error');
      }
    })

    // GET /api/threads/:board - get 10 most recent threads with 3 replies each
    .get(async (req, res) => {
      const board = req.params.board;

      try {
        const threads = await Thread.find({ board })
          .sort({ bumped_on: -1 })
          .limit(10)
          .select('-reported -delete_password')
          .lean();

        threads.forEach(thread => {
          // sort replies by created_on descending and take only 3 latest
          thread.replies = thread.replies
            .sort((a, b) => b.created_on - a.created_on)
            .slice(0, 3)
            .map(({ reported, delete_password, ...reply }) => reply);
        });

        return res.json(threads);
      } catch (err) {
        console.error(err);
        return res.status(500).send('Server error');
      }
    })

    // DELETE /api/threads/:board - delete thread with password
    .delete(async (req, res) => {
      const board = req.params.board;
      const { thread_id, delete_password } = req.body;

      try {
        const thread = await Thread.findOne({ _id: thread_id, board });

        if (!thread) return res.send('incorrect password');

        if (thread.delete_password !== delete_password) return res.send('incorrect password');

        await Thread.deleteOne({ _id: thread_id });

        return res.send('success');
      } catch (err) {
        console.error(err);
        return res.status(500).send('Server error');
      }
    })

    // PUT /api/threads/:board - report thread
    .put(async (req, res) => {
      const board = req.params.board;
      const { thread_id } = req.body;

      try {
        const thread = await Thread.findOne({ _id: thread_id, board });
        if (!thread) return res.status(404).send('Thread not found');

        thread.reported = true;
        await thread.save();

        return res.send('reported');
      } catch (err) {
        console.error(err);
        return res.status(500).send('Server error');
      }
    });

  // REPLIES ROUTES

  // POST /api/replies/:board - create reply
  app.route('/api/replies/:board')
    .post(async (req, res) => {
      const board = req.params.board;
      const { thread_id, text, delete_password } = req.body;

      try {
        const thread = await Thread.findOne({ _id: thread_id, board });
        if (!thread) return res.status(404).send('Thread not found');

        const now = new Date();

        const reply = {
          _id: new ObjectId(),
          text,
          delete_password,
          created_on: now,
          reported: false,
        };

        thread.replies.push(reply);
        thread.bumped_on = now;  // <-- set bumped_on exactly same as reply created_on
        await thread.save();

        return res.redirect(`/b/${board}/${thread_id}`);
      } catch (err) {
        console.error(err);
        return res.status(500).send('Server error');
      }
    })

    // GET /api/replies/:board?thread_id=xxx - get full thread with all replies
    .get(async (req, res) => {
      const board = req.params.board;
      const thread_id = req.query.thread_id;

      try {
        const thread = await Thread.findOne({ _id: thread_id, board })
          .select('-reported -delete_password')
          .lean();

        if (!thread) return res.status(404).send('Thread not found');

        thread.replies = thread.replies.map(({ reported, delete_password, ...reply }) => reply);

        return res.json(thread);
      } catch (err) {
        console.error(err);
        return res.status(500).send('Server error');
      }
    })

    // DELETE /api/replies/:board - delete reply by changing text to [deleted]
    .delete(async (req, res) => {
      const board = req.params.board;
      const { thread_id, reply_id, delete_password } = req.body;

      try {
        const thread = await Thread.findOne({ _id: thread_id, board });
        if (!thread) return res.status(404).send('Thread not found');

        const reply = thread.replies.id(reply_id);
        if (!reply) return res.status(404).send('Reply not found');

        if (reply.delete_password !== delete_password) return res.send('incorrect password');

        reply.text = '[deleted]';
        await thread.save();

        return res.send('success');
      } catch (err) {
        console.error(err);
        return res.status(500).send('Server error');
      }
    })

    // PUT /api/replies/:board - report reply
    .put(async (req, res) => {
      const board = req.params.board;
      const { thread_id, reply_id } = req.body;

      try {
        const thread = await Thread.findOne({ _id: thread_id, board });
        if (!thread) return res.status(404).send('Thread not found');

        const reply = thread.replies.id(reply_id);
        if (!reply) return res.status(404).send('Reply not found');

        reply.reported = true;
        await thread.save();

        return res.send('reported');
      } catch (err) {
        console.error(err);
        return res.status(500).send('Server error');
      }
    });
};
