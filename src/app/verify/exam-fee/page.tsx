"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { api, UPLOAD_BASE } from "@/lib/api";
import { CheckCircle2, XCircle } from "lucide-react";

interface FeeVerify {
  student_id: string;
  name: string;
  class: string;
  group: string | null;
  photo_path: string | null;
  exam_name: string;
  year: string;
  fee_paid: boolean;
  amount: number | null;
  payment_method: string | null;
  collected_at: string | null;
}

function VerifyContent() {
  const search = useSearchParams();
  const [data, setData] = useState<FeeVerify | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const studentId = search.get("student_id");
    const year = search.get("year");
    const exam = search.get("exam");
    if (!studentId || !year || !exam) {
      const t = setTimeout(() => {
        setError("Invalid verification link");
        setLoading(false);
      }, 0);
      return () => clearTimeout(t);
    }
    api
      .get<{ status: number; data: FeeVerify }>(
        `/public/exam-fee-verify?student_id=${encodeURIComponent(studentId)}&year=${year}&exam=${encodeURIComponent(exam)}`,
      )
      .then((res) => setData(res.data))
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : "Verification failed"),
      )
      .finally(() => setLoading(false));
  }, [search]);

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center p-6">
      <h1 className="mb-2 text-center text-2xl font-bold text-gray-900">
        Miah Jinnah Alam Degree College
      </h1>
      <p className="mb-6 text-center text-sm text-gray-500">
        Exam Fee Verification
      </p>

      {loading && <p className="text-gray-500">Verifying...</p>}

      {error && (
        <div className="w-full rounded-lg border border-red-200 bg-red-50 p-4 text-center text-sm text-red-600">
          {error}
        </div>
      )}

      {data && (
        <div className="w-full rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-3">
            {data.photo_path ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={`${UPLOAD_BASE}/uploads/${data.photo_path}`}
                alt={data.name}
                className="h-16 w-16 rounded-full object-cover"
              />
            ) : null}
            <div>
              <p className="text-lg font-semibold text-gray-900">{data.name}</p>
              <p className="text-sm text-gray-500">
                {data.student_id} · Class {data.class}
                {data.group ? ` · ${data.group}` : ""}
              </p>
            </div>
          </div>

          <p className="mb-4 text-sm text-gray-600">
            {data.exam_name} Examination {data.year}
          </p>

          <div
            className={`flex items-center gap-3 rounded-lg p-4 ${
              data.fee_paid
                ? "border border-green-200 bg-green-50"
                : "border border-red-200 bg-red-50"
            }`}
          >
            {data.fee_paid ? (
              <>
                <CheckCircle2 className="h-8 w-8 text-green-600" />
                <div>
                  <p className="font-semibold text-green-700">Exam Fee Paid</p>
                  {data.amount !== null && (
                    <p className="text-sm text-green-600">
                      Amount: ৳{data.amount}
                      {data.payment_method ? ` · ${data.payment_method}` : ""}
                    </p>
                  )}
                </div>
              </>
            ) : (
              <>
                <XCircle className="h-8 w-8 text-red-600" />
                <div>
                  <p className="font-semibold text-red-700">
                    Exam Fee Not Paid
                  </p>
                  <p className="text-sm text-red-500">
                    Please contact the college office.
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ExamFeeVerifyPage() {
  return (
    <Suspense fallback={<div className="p-6 text-center">Loading...</div>}>
      <VerifyContent />
    </Suspense>
  );
}
