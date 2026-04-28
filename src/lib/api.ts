import { NextResponse } from "next/server";

export const apiSuccess = <T>(data: T, status = 200) => {
  return NextResponse.json({ success: true, data }, { status });
};

export const apiError = (message: string, status = 400) => {
  return NextResponse.json(
    {
      success: false,
      error: message,
    },
    { status },
  );
};
