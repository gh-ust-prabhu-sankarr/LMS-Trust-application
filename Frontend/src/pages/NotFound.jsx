import React from "react";
import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="min-h-screen grid place-items-center px-4">
      <div className="glass rounded-2xl p-8 text-center">
        <div className="text-5xl font-black">404</div>
        <div className="mt-2 text-muted">Page not found</div>
        <Link to="/" className="mt-4 inline-block text-sky-300 hover:text-sky-200 font-semibold">
          Go Home
        </Link>
      </div>
    </div>
  );
}
