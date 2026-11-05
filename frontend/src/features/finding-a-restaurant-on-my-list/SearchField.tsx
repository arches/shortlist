import { Search } from "lucide-react";

import { Input } from "@/components/ui/input";

interface SearchFieldProps {
  search: string;
  onSearch: (search: string) => void;
}

// seeing-my-list-on-a-map.drawio draws the field in the floating row, between
// the hamburger and the "+", reading "Search my list…", and annotates it:
// "Search stays in the row, and still floats above the sheet at full".
//
// There is no button to clear it and none is drawn: "clearing the search" is
// emptying the field, which is what brings the whole list back.
export function SearchField({ search, onSearch }: SearchFieldProps) {
  return (
    <div className="relative min-w-0 flex-1">
      <Search
        aria-hidden="true"
        className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2"
      />

      {/*
        Named for anybody who cannot see the row it sits in. The placeholder is
        the wireframe's own words, and a placeholder is not a label.

        type="search" rather than "text": the field searches a list that is
        already here, so a browser offering to submit it somewhere would be
        offering something that does not exist — but the semantics are what the
        control is, and that is a search.
      */}
      <Input
        type="search"
        aria-label="Search my list"
        placeholder="Search my list…"
        value={search}
        onChange={(event) => onSearch(event.target.value)}
        className="h-8 w-full pl-8"
      />
    </div>
  );
}
