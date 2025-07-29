import NavLinks from '@/app/ui/dashboard/nav-links';

export default function BottomNav() {
  return (
    <div className="fixed inset-x-0 bottom-0 px-3 py-4 bg-gray-100">
      <div className="flex grow flex-row justify-between space-x-2">
        <NavLinks />
      </div>
    </div>
  );
}

