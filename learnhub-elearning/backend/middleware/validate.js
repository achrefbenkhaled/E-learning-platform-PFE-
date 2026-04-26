// ── Helpers ───────────────────────────────────────────────

export const sanitize = (str) => {
  if (typeof str !== 'string') return '';
  return str.trim().replace(/<[^>]*>/g, '');
};

export const isValidEmail = (email) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

export const isValidUrl = (url) =>
  /^https?:\/\/.+/.test(url);

export const escapeRegex = (str) =>
  str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// ── Route-level validators ───────────────────────────────

export const validateRegister = (req, res, next) => {
  const errors = [];
  const { email, password, firstName, lastName } = req.body;

  if (!firstName || sanitize(firstName).length === 0)
    errors.push('First name is required');
  else if (sanitize(firstName).length > 50)
    errors.push('First name must be 50 characters or less');

  if (!lastName || sanitize(lastName).length === 0)
    errors.push('Last name is required');
  else if (sanitize(lastName).length > 50)
    errors.push('Last name must be 50 characters or less');

  if (!email) errors.push('Email is required');
  else if (!isValidEmail(email)) errors.push('Invalid email format');

  if (!password) errors.push('Password is required');
  else if (password.length < 6) errors.push('Password must be at least 6 characters');
  else if (password.length > 128) errors.push('Password must be 128 characters or less');

  if (errors.length > 0) return res.status(400).json({ error: errors[0], errors });

  // Sanitize fields in-place
  req.body.firstName = sanitize(firstName);
  req.body.lastName = sanitize(lastName);
  req.body.email = email.trim().toLowerCase();
  next();
};

export const validateLogin = (req, res, next) => {
  const errors = [];
  const { email, password } = req.body;

  if (!email) errors.push('Email is required');
  else if (!isValidEmail(email)) errors.push('Invalid email format');
  if (!password) errors.push('Password is required');

  if (errors.length > 0) return res.status(400).json({ error: errors[0], errors });

  req.body.email = email.trim().toLowerCase();
  next();
};

export const validateCourse = (req, res, next) => {
  const errors = [];
  const { title, description, category, price, thumbnail } = req.body;

  if (!title || sanitize(title).length === 0) errors.push('Title is required');
  else if (sanitize(title).length > 150) errors.push('Title must be 150 characters or less');

  if (!description || sanitize(description).length === 0) errors.push('Description is required');
  else if (sanitize(description).length > 5000) errors.push('Description must be 5000 characters or less');

  if (!category || sanitize(category).length === 0) errors.push('Category is required');

  if (price !== undefined && price !== null && price !== '') {
    const p = Number(price);
    if (isNaN(p) || p < 0 || p > 9999) errors.push('Price must be between 0 and 9999');
  }

  if (thumbnail && !isValidUrl(thumbnail)) errors.push('Thumbnail must be a valid URL');

  if (errors.length > 0) return res.status(400).json({ error: errors[0], errors });

  req.body.title = sanitize(title);
  req.body.description = sanitize(description);
  req.body.category = sanitize(category);
  next();
};

export const validateTest = (req, res, next) => {
  const errors = [];
  const { title, questions } = req.body;

  if (!title || sanitize(title).length === 0) errors.push('Title is required');
  else if (sanitize(title).length > 200) errors.push('Title must be 200 characters or less');

  if (!questions || !Array.isArray(questions) || questions.length === 0)
    errors.push('At least one question is required');

  if (errors.length > 0) return res.status(400).json({ error: errors[0], errors });

  req.body.title = sanitize(title);
  next();
};

export const validatePost = (req, res, next) => {
  const errors = [];
  const { title, content } = req.body;

  if (!title || sanitize(title).length === 0) errors.push('Title is required');
  else if (sanitize(title).length > 200) errors.push('Title must be 200 characters or less');

  if (!content || sanitize(content).length === 0) errors.push('Content is required');
  else if (sanitize(content).length > 10000) errors.push('Content must be 10,000 characters or less');

  if (errors.length > 0) return res.status(400).json({ error: errors[0], errors });

  req.body.title = sanitize(title);
  req.body.content = sanitize(content);
  next();
};

export const validateComment = (req, res, next) => {
  const errors = [];
  const { content } = req.body;

  if (!content || sanitize(content).length === 0) errors.push('Comment is required');
  else if (sanitize(content).length > 2000) errors.push('Comment must be 2,000 characters or less');

  if (errors.length > 0) return res.status(400).json({ error: errors[0], errors });

  req.body.content = sanitize(content);
  next();
};

export const validateReview = (req, res, next) => {
  const errors = [];
  const { rating, comment } = req.body;

  if (!rating) errors.push('Rating is required');
  else {
    const r = Number(rating);
    if (!Number.isInteger(r) || r < 1 || r > 5) errors.push('Rating must be an integer between 1 and 5');
  }

  if (comment && sanitize(comment).length > 1000) errors.push('Review must be 1,000 characters or less');

  if (errors.length > 0) return res.status(400).json({ error: errors[0], errors });

  if (comment) req.body.comment = sanitize(comment);
  next();
};
