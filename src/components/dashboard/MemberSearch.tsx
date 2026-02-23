'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, X } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { membersApi } from '@/lib/api';
import type { Member } from '@/types';

interface MemberSearchProps {
  onSelect: (member: Member) => void;
  excludeIds?: string[];
  placeholder?: string;
}

export default function MemberSearch({
  onSelect,
  excludeIds = [],
  placeholder = 'Search members by name...',
}: MemberSearchProps) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const { data: members = [] } = useQuery({
    queryKey: ['members'],
    queryFn: membersApi.getAll,
  });

  const filtered = members.filter((m) => {
    if (excludeIds.includes(m._id)) return false;
    if (!query) return false;
    const fullName = `${m.firstName} ${m.lastName}`.toLowerCase();
    return fullName.includes(query.toLowerCase());
  });

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={wrapperRef}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => query && setIsOpen(true)}
          placeholder={placeholder}
          className="w-full pl-10 pr-8 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#3AAFDC] focus:border-transparent"
        />
        {query && (
          <button
            onClick={() => {
              setQuery('');
              setIsOpen(false);
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2"
          >
            <X className="w-4 h-4 text-gray-400 hover:text-gray-600" />
          </button>
        )}
      </div>

      {isOpen && filtered.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {filtered.map((member) => (
            <button
              key={member._id}
              onClick={() => {
                onSelect(member);
                setQuery('');
                setIsOpen(false);
              }}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 text-left"
            >
              <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-primary text-xs font-medium">
                {member.firstName[0]}{member.lastName[0]}
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {member.firstName} {member.lastName}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{member.email}</p>
              </div>
            </button>
          ))}
        </div>
      )}

      {isOpen && query && filtered.length === 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-4 text-center">
          <p className="text-sm text-gray-500">No members found</p>
        </div>
      )}
    </div>
  );
}
