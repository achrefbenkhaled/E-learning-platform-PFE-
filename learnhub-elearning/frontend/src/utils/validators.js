export const validateEmail = (email) => {
  if (!email) return 'Email is required';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Invalid email format';
  if (email.length > 100) return 'Email must be 100 characters or less';
  return null;
};

export const validatePassword = (password) => {
  if (!password) return 'Password is required';
  if (password.length < 6) return 'Password must be at least 6 characters';
  if (password.length > 128) return 'Password must be 128 characters or less';
  return null;
};

export const validateName = (name, label = 'Name') => {
  if (!name || !name.trim()) return `${label} is required`;
  if (name.trim().length > 50) return `${label} must be 50 characters or less`;
  return null;
};

export const validateTitle = (title, max = 150) => {
  if (!title || !title.trim()) return 'Title is required';
  if (title.trim().length > max) return `Title must be ${max} characters or less`;
  return null;
};

export const validateDescription = (desc, max = 5000) => {
  if (!desc || !desc.trim()) return 'Description is required';
  if (desc.trim().length > max) return `Description must be ${max} characters or less`;
  return null;
};

export const validateUrl = (url) => {
  if (!url) return null; // optional
  if (!/^https?:\/\/.+/.test(url)) return 'Must be a valid URL (http:// or https://)';
  return null;
};

export const validatePrice = (price) => {
  if (price === '' || price === undefined || price === null) return null;
  const p = Number(price);
  if (isNaN(p)) return 'Price must be a number';
  if (p < 0) return 'Price cannot be negative';
  if (p > 9999) return 'Price must be 9,999 or less';
  return null;
};

export const validateRating = (rating) => {
  if (!rating) return 'Rating is required';
  const r = Number(rating);
  if (!Number.isInteger(r) || r < 1 || r > 5) return 'Rating must be between 1 and 5';
  return null;
};

export const validateComment = (text, max = 2000) => {
  if (!text || !text.trim()) return 'Comment is required';
  if (text.trim().length > max) return `Must be ${max} characters or less`;
  return null;
};

export const validateCardNumber = (num) => {
  if (!num) return 'Card number is required';
  const digits = num.replace(/\s/g, '');
  if (!/^\d{16}$/.test(digits)) return 'Card number must be 16 digits';
  return null;
};

export const validateExpiry = (exp) => {
  if (!exp) return 'Expiry date is required';
  if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(exp)) return 'Format must be MM/YY';
  return null;
};

export const validateCvv = (cvv) => {
  if (!cvv) return 'CVV is required';
  if (!/^\d{3,4}$/.test(cvv)) return 'CVV must be 3 or 4 digits';
  return null;
};
