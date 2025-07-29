import BottomNav from '@/app/ui/dashboard/bottomnav';
 
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen flex-col">
      <div className="w-full flex-none">
        <BottomNav />
      </div>
      <div className="flex-grow p-6">{children}</div>
    </div>
  );
}