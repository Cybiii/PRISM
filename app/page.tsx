import { ArrowRightIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';

export default function Page() {
  return (
    <main className="flex min-h-screen flex-col p-6">
        {/* <p className="text-blue-600 text-center ">
          <strong>Project PUMA</strong>
        </p>
        <p className="text-blue-600 text-center text-sm">
          <strong>Photosensitive Urinary Something Something</strong>
        </p> */}
        <div className="flex justify-end items-center grow flex-col gap-4">
          <Link
            href="/dashboard"
            className="flex self-center gap-5 self-start rounded-lg bg-blue-600 px-6 py-4 text-lg font-medium text-white transition-colors hover:bg-blue-400"
          >
            <span>Get Started</span> <ArrowRightIcon className="w-5 md:w-6" />
          </Link>
        </div>
    </main>
  );
}
