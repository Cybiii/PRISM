import NavLinks from '@/app/ui/dashboard/nav-links';

export default function BottomNav() {
  return (
    <div className="fixed inset-x-0 bottom-4 px-3 py-4">
      <div className="flex grow flex-row justify-between space-x-2">
        <NavLinks />
      </div>
    </div>
  );
}
