/**
 * Contact Form API Client.
 * Connects React frontend to FastAPI contact endpoints.
 */

import api from "./axios";

/**
 * Submit a contact form message.
 * @param {object} contactData - { name, email, subject, message }
 */
export async function submitContactForm(contactData) {
  const res = await api.post("/contact", contactData);
  return res.data;
}
