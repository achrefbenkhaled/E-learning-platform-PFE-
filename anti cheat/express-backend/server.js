/**
 * Anti-cheat API for WPF client + React exam front end.
 * Legacy SSE routes kept for optional dev dashboards.
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const {
    createSession,
    recordHeartbeat,
    getStatus,
    stopSession,
    getFirstEligibleSessionToken,
    HEARTBEAT_TTL_MS,
} = require('./lib/anticheatSessions');
const { Test, TestAttempt } = require('./models/Test');
const authMiddleware = require('./middleware/auth');

const app = express();
const port = process.env.PORT || 3001;

// --- MongoDB Connection ---
const mongodbUri = process.env.MONGODB_URI;
if (!mongodbUri) {
    console.error('Error: MONGODB_URI not set in .env file');
    process.exit(1);
}

mongoose.connect(mongodbUri, {
    maxPoolSize: 5, // Smaller pool for the helper backend
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
})
    .then(() => {
        console.log('✓ MongoDB connected successfully (Anti-Cheat Backend)');
    })
    .catch((err) => {
        console.error('✗ MongoDB connection error:', err.message);
        process.exit(1);
    });

// Handle runtime disconnection
mongoose.connection.on('error', (err) => {
    console.error(`✗ MongoDB runtime error (Anti-Cheat): ${err.message}`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
    await mongoose.connection.close();
    console.log('✓ MongoDB connection closed (Anti-Cheat)');
    process.exit(0);
});

let antiCheatEnabled = false;
let pendingExamStartRequest = null; // { token, testId, accessToken, refreshToken }
let latestProctorReport = {
    updatedAt: null,
    stdout: '',
    stderr: '',
    summary: null,
};
let latestProctorFramePath = null;

app.use(cors());
app.use(express.json());

function syncLegacyBroadcastFlag() {
    antiCheatEnabled = getFirstEligibleSessionToken() !== null;
}

// --- New anti-cheat session API (WPF + React exam) ---

/** WPF: start protection — creates server-side session and returns token for the exam URL. */
app.post('/api/anticheat/start', (req, res) => {
    const token = createSession();
    syncLegacyBroadcastFlag();
    res.json({
        ok: true,
        token,
        heartbeatIntervalMs: 8000,
        heartbeatTtlMs: HEARTBEAT_TTL_MS,
    });
});

/** React: poll whether the desktop session is still alive and compliant. */
app.get('/api/anticheat/status/:token', (req, res) => {
    const { token } = req.params;
    const status = getStatus(token);
    syncLegacyBroadcastFlag();
    res.json({
        active: status.active,
        validToken: status.validToken,
        violation: status.violation ?? false,
        reasons: status.reasons ?? [],
        reason: status.reason ?? null,
    });
});

/** WPF: periodic keep-alive + optional environment re-check failure. */
app.post('/api/anticheat/heartbeat', (req, res) => {
    const token = req.body?.token;
    if (!token || typeof token !== 'string') {
        return res.status(400).json({ ok: false, error: 'token required' });
    }
    const checksPassed = req.body?.checksPassed !== false;
    const messages = Array.isArray(req.body?.messages) ? req.body.messages : [];
    const ok = recordHeartbeat(token, { checksPassed, messages });
    if (!ok) {
        return res.status(404).json({ ok: false, error: 'unknown_token' });
    }
    const status = getStatus(token);
    syncLegacyBroadcastFlag();
    res.json({
        ok: true,
        active: status.active,
        violation: status.violation,
    });
});

/**
 * Browser: check if a desktop anti-cheat session exists and get its token for /#/exam?token=
 * (single active session scenario; not for untrusted networks without extra auth).
 */
app.get('/api/anticheat/session-token', (req, res) => {
    const token = getFirstEligibleSessionToken();
    syncLegacyBroadcastFlag();
    if (!token) {
        return res.json({ ok: false, enabled: false });
    }
    res.json({ ok: true, enabled: true, token });
});

/**
 * Browser: ask the desktop WPF app to start the locked exam host.
 * The request is accepted only for an active, non-violation anti-cheat token.
 */
app.post('/api/anticheat/request-exam-start', (req, res) => {
    const token = req.body?.token;
    if (!token || typeof token !== 'string') {
        return res.status(400).json({ ok: false, error: 'token required' });
    }
    const st = getStatus(token);
    syncLegacyBroadcastFlag();
    if (!st.active || !st.validToken || st.violation) {
        return res.status(403).json({ ok: false, error: 'anticheat_not_active' });
    }
    pendingExamStartRequest = { 
        token, 
        testId: req.body?.testId,
        accessToken: req.body?.accessToken,
        refreshToken: req.body?.refreshToken
    };
    res.json({ ok: true });
});

/**
 * WPF polling endpoint: consume one pending exam-start request.
 * Returns token once and clears the pending request.
 */
app.get('/api/anticheat/exam-start-pending', (req, res) => {
    const request = pendingExamStartRequest;
    pendingExamStartRequest = null;
    res.json({ 
        pending: !!request, 
        token: request?.token ?? null,
        testId: request?.testId ?? null,
        accessToken: request?.accessToken ?? null,
        refreshToken: request?.refreshToken ?? null
    });
});

/** WPF: reset report when a new exam starts. */
app.post('/api/proctor/reset', (req, res) => {
    latestProctorReport = {
        updatedAt: new Date().toISOString(),
        stdout: '',
        stderr: '',
        summary: null,
    };
    latestProctorFramePath = typeof req.body?.framePath === 'string' ? req.body.framePath : null;
    res.json({ ok: true });
});

/** WPF: push final proctor output so React can display it. */
app.post('/api/proctor/report', async (req, res) => {
    latestProctorReport = {
        updatedAt: new Date().toISOString(),
        stdout: typeof req.body?.stdout === 'string' ? req.body.stdout : '',
        stderr: typeof req.body?.stderr === 'string' ? req.body.stderr : '',
        summary: req.body?.summary ?? null,
    };

    if (req.body?.session_code) {
        try {
            const updateProps = {};
            
            // If raw proctoringData is given (react frontend bypassing summary), sync it piece by piece
            if (req.body.proctoringData) {
                for (const key in req.body.proctoringData) {
                    updateProps[`proctoringData.${key}`] = req.body.proctoringData[key];
                }
            } 
            
            // If we have summary from WPF, map correctly
            if (req.body.summary) {
                const s = req.body.summary;
                if (s.looking_away_percent !== undefined) updateProps['proctoringData.lookingAwayPercent'] = s.looking_away_percent;
                if (s.phone_detection_percent !== undefined) updateProps['proctoringData.phoneDetectionPercent'] = s.phone_detection_percent;
                if (s.phone_detected_count !== undefined) updateProps['proctoringData.phoneDetectedCount'] = s.phone_detected_count;
                if (s.unauthorized_person_percent !== undefined) updateProps['proctoringData.unauthorizedPersonPercent'] = s.unauthorized_person_percent;
                if (s.unauthorized_person_detected_count !== undefined) updateProps['proctoringData.multiplePersonsCount'] = s.unauthorized_person_detected_count;
                if (s.no_person_percent !== undefined) updateProps['proctoringData.noPersonPercent'] = s.no_person_percent;
                if (s.no_person_detected_count !== undefined) updateProps['proctoringData.noPersonCount'] = s.no_person_detected_count;
                if (s.face_verified !== undefined) updateProps['proctoringData.faceVerified'] = s.face_verified;
                if (s.face_comparison_error !== undefined) updateProps['proctoringData.faceComparisonError'] = s.face_comparison_error;
                if (s.away_count !== undefined) updateProps['proctoringData.lookingAwayCount'] = s.away_count;
            }

            if (Object.keys(updateProps).length > 0) {
                await TestAttempt.findByIdAndUpdate(req.body.session_code, { $set: updateProps });
            }
        } catch (err) {
            console.error('Failed to save proctoringData', err);
        }
    }

    res.json({ ok: true });
});

/** React: read latest report (poll). */
app.get('/api/proctor/report', (req, res) => {
    res.json(latestProctorReport);
});

/** React: fetch latest camera frame pushed by Python (written to disk by WPF env path). */
app.get('/api/proctor/frame', (req, res) => {
    if (!latestProctorFramePath || !fs.existsSync(latestProctorFramePath)) {
        return res.status(404).json({ ok: false, error: 'frame_not_available' });
    }
    res.setHeader('Cache-Control', 'no-store');
    res.sendFile(latestProctorFramePath, (err) => {
        if (err) {
            res.status(500).json({ ok: false, error: 'frame_read_failed' });
        }
    });
});

/** WPF: user turned anti-cheat off or app is closing. */
app.post('/api/anticheat/stop', (req, res) => {
    const token = req.body?.token;
    if (token && typeof token === 'string') {
        stopSession(token);
    }
    syncLegacyBroadcastFlag();
    res.json({ ok: true });
});

// --- Exam API routes (shared DB with main e-learning backend) ---

/** Public: fetch test info for preview (no auth needed). */
app.get('/api/exam/:testId', async (req, res) => {
    try {
        const test = await Test.findById(req.params.testId);
        if (!test) return res.status(404).json({ error: 'Test not found' });
        if (test.status !== 'published') return res.status(404).json({ error: 'Test not available' });

        res.json({
            _id: test._id,
            title: test.title,
            description: test.description,
            questionCount: test.questions.length,
            settings: {
                duration: test.settings.duration,
                passingScore: test.settings.passingScore,
                scheduledStartTime: test.settings.scheduledStartTime,
                scheduledEndTime: test.settings.scheduledEndTime,
                scheduleWindows: test.settings.scheduleWindows,
                showResults: test.settings.showResults,
            },
        });
    } catch (err) {
        if (err.name === 'CastError') return res.status(400).json({ error: 'Invalid test ID' });
        console.error('Get exam info error:', err);
        res.status(500).json({ error: 'Failed to load test' });
    }
});

/** Auth: start a test attempt — validates schedule, creates TestAttempt, returns questions. */
app.post('/api/exam/:testId/start', authMiddleware, async (req, res) => {
    try {
        const test = await Test.findById(req.params.testId);
        if (!test) return res.status(404).json({ error: 'Test not found' });
        if (test.status !== 'published') return res.status(404).json({ error: 'Test not available' });

        // Check for existing in-progress attempt
        const existing = await TestAttempt.findOne({
            testId: test._id,
            userId: req.userId,
            status: 'in-progress',
        });

        // Anti-cheat tests: no resume, one attempt only
        if (test.settings?.requireAntiCheat) {
            if (existing) {
                // Auto-close the abandoned attempt
                existing.status = 'submitted';
                existing.submittedAt = new Date();
                await existing.save();
                return res.status(400).json({ error: 'Your previous anti-cheat session was closed. You cannot retake this test.' });
            }
        } else if (existing) {
            // Normal tests: allow resume
            const questionsForStudent = test.questions.map(q => ({
                _id: q._id,
                question: q.question,
                type: q.type,
                options: q.options,
                points: q.points,
                attachments: q.attachments || [],
            }));
            const elapsed = Date.now() - new Date(existing.startedAt).getTime();
            const totalMs = (test.settings.duration || 30) * 60 * 1000;
            const remaining = Math.max(0, totalMs - elapsed);
            if (remaining <= 0) {
                // Time expired on an old attempt — auto-close it
                existing.status = 'submitted';
                existing.submittedAt = new Date();
                await existing.save();
                return res.status(400).json({ error: 'Your previous attempt has expired' });
            }
            return res.json({
                attemptId: existing._id,
                sessionId: existing.sessionId,
                questions: questionsForStudent,
                duration: test.settings.duration,
                remainingMs: remaining,
                testTitle: test.title,
                resumed: true,
            });
        }

        // Check for already-submitted attempt
        const submitted = await TestAttempt.findOne({
            testId: test._id,
            userId: req.userId,
            status: { $in: ['submitted', 'completed', 'graded'] },
        });
        if (submitted) {
            return res.status(400).json({
                error: 'You have already submitted this test',
                attemptId: submitted._id,
            });
        }

        // Validate schedule windows
        const now = new Date();
        const windows = test.settings.scheduleWindows || [];
        if (windows.length > 0) {
            const isWithinWindow = windows.some(w => now >= new Date(w.startTime) && now <= new Date(w.endTime));
            if (!isWithinWindow) {
                return res.status(400).json({ error: 'Test is not currently accessible' });
            }
        } else {
            if (test.settings.scheduledStartTime && now < new Date(test.settings.scheduledStartTime)) {
                return res.status(400).json({ error: 'Test has not started yet' });
            }
            if (test.settings.scheduledEndTime && now > new Date(test.settings.scheduledEndTime)) {
                return res.status(400).json({ error: 'Test has ended' });
            }
        }

        // Create new attempt
        const sessionId = uuidv4();
        const attempt = new TestAttempt({
            testId: test._id,
            userId: req.userId,
            responses: [],
            startedAt: new Date(),
            sessionId,
            status: 'in-progress',
        });
        await attempt.save();

        const questionsForStudent = test.questions.map(q => ({
            _id: q._id,
            question: q.question,
            type: q.type,
            options: q.options,
            points: q.points,
            attachments: q.attachments || [],
        }));

        res.json({
            attemptId: attempt._id,
            sessionId,
            questions: questionsForStudent,
            duration: test.settings.duration,
            remainingMs: (test.settings.duration || 30) * 60 * 1000,
            testTitle: test.title,
            resumed: false,
        });
    } catch (err) {
        if (err.name === 'CastError') return res.status(400).json({ error: 'Invalid test ID' });
        console.error('Start exam error:', err);
        res.status(500).json({ error: 'Failed to start test' });
    }
});

/** Auth: submit a test — grades all answers, computes score. */
app.post('/api/exam/submit', authMiddleware, async (req, res) => {
    try {
        const { attemptId, answers } = req.body;
        if (!attemptId) return res.status(400).json({ error: 'attemptId required' });

        const attempt = await TestAttempt.findById(attemptId);
        if (!attempt) return res.status(404).json({ error: 'Attempt not found' });
        if (attempt.userId.toString() !== req.userId) return res.status(403).json({ error: 'Not authorized' });
        if (attempt.status === 'submitted' || attempt.status === 'graded') {
            return res.status(400).json({ error: 'Test already submitted' });
        }

        const test = await Test.findById(attempt.testId);
        if (!test) return res.status(404).json({ error: 'Test not found' });

        // Normalize answers — support array [{questionId, answer}] and object {"0":"answer"}
        let answersMap = {};
        if (Array.isArray(answers)) {
            answers.forEach(a => { answersMap[a.questionId ?? a.questionIndex ?? ''] = a.answer; });
        } else if (answers && typeof answers === 'object') {
            answersMap = answers;
        }

        // Grade
        let totalPoints = 0;
        let earnedPoints = 0;
        const responses = [];

        test.questions.forEach((q, index) => {
            totalPoints += (q.points || 1);
            const userAnswer = answersMap[index.toString()] || answersMap[index] || answersMap[q._id?.toString()] || '';
            const isCorrect = userAnswer.toString().toLowerCase().trim() === (q.correctAnswer || '').toString().toLowerCase().trim();
            if (isCorrect) earnedPoints += (q.points || 1);
            responses.push({
                questionId: q._id,
                questionIndex: index,
                answer: userAnswer,
                isCorrect,
                points: isCorrect ? (q.points || 1) : 0,
            });
        });

        const percentage = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0;
        const passed = percentage >= (test.settings?.passingScore || 50);

        attempt.responses = responses;
        attempt.score = earnedPoints;
        attempt.totalPoints = totalPoints;
        attempt.percentage = percentage;
        attempt.passed = passed;
        attempt.status = 'submitted';
        attempt.submittedAt = new Date();
        attempt.timeTaken = Math.round((Date.now() - new Date(attempt.startedAt).getTime()) / 1000);
        await attempt.save();

        res.json({
            attemptId: attempt._id,
            score: earnedPoints,
            totalPoints,
            percentage,
            passed,
            testTitle: test.title,
            showResults: test.settings?.showResults ?? true,
        });
    } catch (err) {
        if (err.name === 'CastError') return res.status(400).json({ error: 'Invalid ID' });
        console.error('Submit exam error:', err);
        res.status(500).json({ error: 'Failed to submit test' });
    }
});

/** Auth: get attempt results. */
app.get('/api/exam/attempt/:attemptId', authMiddleware, async (req, res) => {
    try {
        const attempt = await TestAttempt.findById(req.params.attemptId);
        if (!attempt) return res.status(404).json({ error: 'Attempt not found' });

        const test = await Test.findById(attempt.testId);
        const isOwner = attempt.userId.toString() === req.userId;
        const isCreator = test && test.createdBy.toString() === req.userId;
        if (!isOwner && !isCreator) return res.status(403).json({ error: 'Not authorized' });

        const detailedResults = (attempt.responses || []).map((r, i) => {
            const question = test?.questions?.[r.questionIndex ?? i];
            return {
                question: question?.question || `Question ${i + 1}`,
                type: question?.type,
                options: question?.options,
                attachments: question?.attachments || [],
                userAnswer: r.answer,
                correctAnswer: question?.correctAnswer,
                isCorrect: r.isCorrect,
                points: r.points,
            };
        });

        res.json({
            attempt: {
                _id: attempt._id,
                score: attempt.score,
                totalPoints: attempt.totalPoints,
                percentage: attempt.percentage,
                passed: attempt.passed,
                status: attempt.status,
                submittedAt: attempt.submittedAt,
                createdAt: attempt.createdAt,
            },
            testTitle: test?.title || 'Unknown Test',
            showResults: test?.settings?.showResults ?? true,
            results: detailedResults,
        });
    } catch (err) {
        if (err.name === 'CastError') return res.status(400).json({ error: 'Invalid ID' });
        console.error('Get attempt error:', err);
        res.status(500).json({ error: 'Failed to fetch attempt' });
    }
});

/** Auth: refresh an expired access token using a refresh token. */
app.post('/api/auth/refresh', (req, res) => {
    try {
        const { refreshToken } = req.body;
        if (!refreshToken) return res.status(400).json({ error: 'Refresh token required' });

        const secret = process.env.JWT_REFRESH_SECRET;
        if (!secret) return res.status(500).json({ error: 'Server misconfigured' });

        const decoded = jwt.verify(refreshToken, secret);
        const userId = decoded.userId || decoded.id || decoded.sub;
        if (!userId) return res.status(401).json({ error: 'Invalid refresh token' });

        const accessSecret = process.env.JWT_ACCESS_SECRET;
        const accessExpiry = process.env.JWT_ACCESS_EXPIRY || '15m';
        const refreshExpiry = process.env.JWT_REFRESH_EXPIRY || '7d';

        const newAccessToken = jwt.sign({ userId }, accessSecret, { expiresIn: accessExpiry });
        const newRefreshToken = jwt.sign({ userId }, secret, { expiresIn: refreshExpiry });

        res.json({ accessToken: newAccessToken, refreshToken: newRefreshToken });
    } catch (err) {
        if (err.name === 'TokenExpiredError') return res.status(401).json({ error: 'Refresh token expired' });
        return res.status(401).json({ error: 'Invalid refresh token' });
    }
});

// --- Legacy / dev ---

app.get('/api/anti-cheat-status', (req, res) => {
    syncLegacyBroadcastFlag();
    res.json({ enabled: antiCheatEnabled });
});

app.listen(port, () => {
    console.log(`Anti-cheat API listening at http://localhost:${port}`);
    console.log('  POST /api/anticheat/start');
    console.log('  GET  /api/anticheat/status/:token');
    console.log('  POST /api/anticheat/heartbeat');
    console.log('  POST /api/anticheat/stop');
    console.log('  GET  /api/anticheat/session-token');
    console.log('  POST /api/anticheat/request-exam-start');
    console.log('  GET  /api/anticheat/exam-start-pending');
    console.log('  GET  /api/proctor/report');
    console.log('  GET  /api/proctor/frame');
});
