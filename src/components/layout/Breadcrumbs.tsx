// src/components/layout/Breadcrumbs.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRightIcon } from '@heroicons/react/20/solid'; // Using a smaller icon

const Breadcrumbs: React.FC = () => {
  const pathname = usePathname();
  const pathSegments = pathname.split('/').filter(segment => segment); // Filter out empty strings

  const breadcrumbItems = pathSegments.map((segment, index) => {
    const href = '/' + pathSegments.slice(0, index + 1).join('/');
    // Capitalize the first letter, replace hyphens with spaces
    const label = segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' ');
    return { href, label };
  });

  return (
    <nav aria-label="Breadcrumb" className="bg-gray-700 px-6 py-2 border-b border-gray-600"> {/* Using bg-gray-700 and a darker border-b-gray-600 */}
      <ol role="list" className="flex items-center space-x-1 text-sm">
        <li>
          <div>
            <Link href="/" className="text-gray-400 hover:text-gray-200">
              Home
            </Link>
          </div>
        </li>
        {breadcrumbItems.map((item, index) => (
          <li key={item.href}>
            <div className="flex items-center">
              <ChevronRightIcon className="h-5 w-5 flex-shrink-0 text-gray-500" aria-hidden="true" />
              {index === breadcrumbItems.length - 1 ? (
                <span className="ml-1 text-gray-300 font-medium"> {/* Made last item slightly more prominent */}
                  {item.label}
                </span>
              ) : (
                <Link
                  href={item.href}
                  className="ml-1 text-gray-400 hover:text-gray-200"
                  aria-current={index === breadcrumbItems.length - 1 ? 'page' : undefined} // aria-current is good for active link styling if needed
                >
                  {item.label}
                </Link>
              )}
            </div>
          </li>
        ))}
      </ol>
    </nav>
  );
};

export default Breadcrumbs;
