/**
 * Next.js API route that proxies requests to the FastAPI ML inference service
 * 
 * This route acts as a bridge between the Next.js frontend and the Python FastAPI service.
 * 
 * Usage:
 *   POST /api/ml/predict?type=diabetes
 *   POST /api/ml/predict?type=cardio
 */

import { NextRequest, NextResponse } from "next/server";

const ML_API_URL = process.env.ML_API_URL || "http://localhost:8000";

interface DiabetesRequest {
  glucose: number;
  bmi: number;
  age: number;
  bp: number;
}

interface CardioRequest {
  age: number;
  systolic_bp: number;
  cholesterol: number;
  resting_hr: number;
}

export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type"); // "diabetes" or "cardio"

  if (!type || !["diabetes", "cardio"].includes(type)) {
    return NextResponse.json(
      { error: "Invalid type. Must be 'diabetes' or 'cardio'" },
      { status: 400 }
    );
  }

  try {
    const body = await req.json();

    // Validate request body based on type
    if (type === "diabetes") {
      const data = body as DiabetesRequest;
      if (!data.glucose || !data.bmi || !data.age || !data.bp) {
        return NextResponse.json(
          { error: "Missing required fields: glucose, bmi, age, bp" },
          { status: 400 }
        );
      }
    } else if (type === "cardio") {
      const data = body as CardioRequest;
      if (!data.age || !data.systolic_bp || !data.cholesterol || !data.resting_hr) {
        return NextResponse.json(
          { error: "Missing required fields: age, systolic_bp, cholesterol, resting_hr" },
          { status: 400 }
        );
      }
    }

    // Transform request body to match FastAPI schema
    let apiBody: any;
    if (type === "diabetes") {
      const data = body as DiabetesRequest;
      apiBody = {
        glucose: data.glucose,
        bmi: data.bmi,
        age: data.age,
        bp: data.bp,
      };
    } else {
      const data = body as CardioRequest;
      apiBody = {
        age: data.age,
        systolic_bp: data.systolic_bp,
        cholesterol: data.cholesterol,
        resting_hr: data.resting_hr,
      };
    }

    // Call FastAPI service
    const response = await fetch(`${ML_API_URL}/predict/${type}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(apiBody),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: "Unknown error" }));
      return NextResponse.json(
        { error: error.detail || "ML service error" },
        { status: response.status }
      );
    }

    const result = await response.json();

    // Add disclaimer
    return NextResponse.json({
      ...result,
      disclaimer:
        "SubHealthAI predictions are non-diagnostic research metrics. They do not confirm or rule out any disease. Please consult a physician for medical interpretation.",
      non_diagnostic: true,
    });
  } catch (error) {
    console.error("Error calling ML API:", error);
    return NextResponse.json(
      {
        error: "Failed to connect to ML inference service. Make sure the FastAPI service is running.",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 503 }
    );
  }
}

export async function GET(req: NextRequest) {
  // Health check endpoint
  try {
    const response = await fetch(`${ML_API_URL}/health`, {
      method: "GET",
    });

    if (!response.ok) {
      return NextResponse.json(
        { status: "unhealthy", ml_service: "down" },
        { status: 503 }
      );
    }

    const health = await response.json();
    return NextResponse.json({
      status: "healthy",
      ml_service: health,
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: "unhealthy",
        ml_service: "connection_failed",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 503 }
    );
  }
}

