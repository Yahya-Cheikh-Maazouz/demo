"use client";

import { useEffect } from "react";
import { forgetOfflinePages } from "./offline-pages";

/**
 * Rendered on /connexion, where every sign-out and every lost session lands: the instructor pages
 * saved on this device for offline use are deleted, so they never outlive the session.
 */
export function ForgetOfflinePages() {
  useEffect(() => {
    void forgetOfflinePages();
  }, []);
  return null;
}
