const chai = require('chai');
const chaiHttp = require('chai-http');
const server = require('../server'); // path to your server.js exported app
const assert = chai.assert;

chai.use(chaiHttp);

suite('Functional Tests', function () {
  this.timeout(5000);

  let testThreadId;
  let testReplyId;
  const board = 'testboard';

  test('POST /api/threads/{board} creates thread', done => {
    chai.request(server)
      .post(`/api/threads/${board}`)
      .send({ text: 'Test thread', delete_password: 'pass123' })
      .end((err, res) => {
        assert.equal(res.status, 200);
        done();
      });
  });

  test('GET /api/threads/{board} returns threads array', done => {
    chai.request(server)
      .get(`/api/threads/${board}`)
      .end((err, res) => {
        assert.equal(res.status, 200);
        assert.isArray(res.body);
        if (res.body.length > 0) testThreadId = res.body[0]._id;
        done();
      });
  });

  test('POST /api/replies/{board} creates reply', done => {
    chai.request(server)
      .post(`/api/replies/${board}`)
      .send({ thread_id: testThreadId, text: 'Test reply', delete_password: 'pass123' })
      .end((err, res) => {
        assert.equal(res.status, 200);
        done();
      });
  });

  test('GET /api/replies/{board} returns entire thread with all replies', done => {
    chai.request(server)
      .get(`/api/replies/${board}`)
      .query({ thread_id: testThreadId })
      .end((err, res) => {
        assert.equal(res.status, 200);
        assert.isObject(res.body);
        assert.property(res.body, 'replies');
        if (res.body.replies.length > 0) testReplyId = res.body.replies[0]._id;
        done();
      });
  });

  test('PUT /api/threads/{board} reports thread', done => {
    chai.request(server)
      .put(`/api/threads/${board}`)
      .send({ thread_id: testThreadId })
      .end((err, res) => {
        assert.equal(res.status, 200);
        assert.equal(res.text, 'reported');
        done();
      });
  });

  test('PUT /api/replies/{board} reports reply', done => {
    chai.request(server)
      .put(`/api/replies/${board}`)
      .send({ thread_id: testThreadId, reply_id: testReplyId })
      .end((err, res) => {
        assert.equal(res.status, 200);
        assert.equal(res.text, 'reported');
        done();
      });
  });

  test('DELETE /api/replies/{board} with incorrect password', done => {
    chai.request(server)
      .delete(`/api/replies/${board}`)
      .send({ thread_id: testThreadId, reply_id: testReplyId, delete_password: 'wrongpass' })
      .end((err, res) => {
        assert.equal(res.status, 200);
        assert.equal(res.text, 'incorrect password');
        done();
      });
  });

  test('DELETE /api/replies/{board} with correct password', done => {
    chai.request(server)
      .delete(`/api/replies/${board}`)
      .send({ thread_id: testThreadId, reply_id: testReplyId, delete_password: 'pass123' })
      .end((err, res) => {
        assert.equal(res.status, 200);
        assert.equal(res.text, 'success');
        done();
      });
  });

  test('DELETE /api/threads/{board} with incorrect password', done => {
    chai.request(server)
      .delete(`/api/threads/${board}`)
      .send({ thread_id: testThreadId, delete_password: 'wrongpass' })
      .end((err, res) => {
        assert.equal(res.status, 200);
        assert.equal(res.text, 'incorrect password');
        done();
      });
  });

  test('DELETE /api/threads/{board} with correct password', done => {
    chai.request(server)
      .delete(`/api/threads/${board}`)
      .send({ thread_id: testThreadId, delete_password: 'pass123' })
      .end((err, res) => {
        assert.equal(res.status, 200);
        assert.equal(res.text, 'success');
        done();
      });
  });
});
