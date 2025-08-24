// components/IconPicker.tsx
import React, { useState } from 'react';
import { Button } from '../ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from './popover';
import { Input } from '../ui/input';
import { Search, X } from 'lucide-react';
import { cn } from '../../lib/utils';

interface IconPickerProps {
  value?: string;
  onChange: (icon: string) => void;
  trigger?: React.ReactNode;
  className?: string;
}

// Comprehensive icon categories
const iconCategories = {
  'Popular': ['📝', '📚', '💡', '🎯', '📊', '🔥', '⭐', '🚀', '💻', '📱', '🎨', '🎵'],
  'Emotions': ['😀', '😍', '🤔', '😎', '🥳', '😴', '🤗', '😇', '🙃', '😊', '😂', '🥺'],
  'Objects': ['📖', '✏️', '📏', '📐', '🔍', '🔑', '💼', '📦', '🎁', '📷', '🖼️', '🗂️'],
  'Nature': ['🌱', '🌸', '🌞', '🌙', '⭐', '🌈', '🔥', '💧', '🌊', '🌿', '🍃', '🌺'],
  'Food': ['🍎', '🍕', '🍔', '🍰', '🍪', '☕', '🍵', '🥤', '🍯', '🍇', '🥑', '🍓'],
  'Travel': ['✈️', '🚗', '🚲', '🗺️', '🧳', '🏖️', '🏔️', '🎪', '🏰', '🗽', '🌍', '🎢'],
  'Activities': ['🎮', '⚽', '🏀', '🎾', '🏊', '🏃', '🧘', '🎭', '🎪', '🎨', '🎸', '📚'],
  'Symbols': ['❤️', '💙', '💚', '💛', '🧡', '💜', '✅', '❌', '⚠️', '💯', '🔴', '🟢'],
  'Work': ['💼', '📊', '📈', '📉', '💰', '💳', '📝', '📋', '🗃️', '📁', '🖊️', '⌨️'],
  'Tech': ['💻', '📱', '⌚', '🖥️', '🖨️', '📟', '💾', '💿', '🔌', '🔋', '📡', '🛰️']
};

// Flatten all icons for search
const allIcons = Object.values(iconCategories).flat();

const IconPicker: React.FC<IconPickerProps> = ({
  value,
  onChange,
  trigger,
  className
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Popular');
  const [isOpen, setIsOpen] = useState(false);

  // Filter icons based on search query
  const filteredIcons = searchQuery
    ? allIcons.filter(icon => 
        // This is a simple search - in a real app you might want more sophisticated matching
        icon.includes(searchQuery) || 
        Object.entries(iconCategories).some(([category, icons]) => 
          icons.includes(icon) && category.toLowerCase().includes(searchQuery.toLowerCase())
        )
      )
    : iconCategories[selectedCategory as keyof typeof iconCategories] || [];

  const handleIconSelect = (icon: string) => {
    onChange(icon);
    setIsOpen(false);
    setSearchQuery('');
  };

  const handleClearIcon = () => {
    onChange('');
    setIsOpen(false);
  };

  const defaultTrigger = (
    <Button
      variant="outline"
      className={cn("w-12 h-12 p-0", className)}
    >
      {value ? (
        <span className="text-2xl">{value}</span>
      ) : (
        <span className="text-muted-foreground text-sm">+</span>
      )}
    </Button>
  );

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        {trigger || defaultTrigger}
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <div className="p-4 space-y-4">
          {/* Header with clear option */}
          <div className="flex items-center justify-between">
            <h4 className="font-medium">Choose an icon</h4>
            {value && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearIcon}
                className="h-6 w-6 p-0"
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search icons..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Categories */}
          {!searchQuery && (
            <div className="flex flex-wrap gap-1">
              {Object.keys(iconCategories).map((category) => (
                <Button
                  key={category}
                  variant={selectedCategory === category ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setSelectedCategory(category)}
                  className="h-7 px-2 text-xs"
                >
                  {category}
                </Button>
              ))}
            </div>
          )}

          {/* Icons Grid */}
          <div className="grid grid-cols-8 gap-2 max-h-48 overflow-y-auto">
            {filteredIcons.map((icon, index) => (
              <Button
                key={`${icon}-${index}`}
                variant="ghost"
                size="sm"
                onClick={() => handleIconSelect(icon)}
                className={cn(
                  "h-10 w-10 p-0 text-lg hover:bg-muted",
                  value === icon && "bg-primary/10 ring-1 ring-primary/20"
                )}
                title={icon}
              >
                {icon}
              </Button>
            ))}
          </div>

          {/* No results */}
          {filteredIcons.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <span className="text-4xl mb-2 block">🔍</span>
              <p className="text-sm">No icons found</p>
              <p className="text-xs">Try a different search term</p>
            </div>
          )}

          {/* Current selection */}
          {value && (
            <div className="border-t pt-3 flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Current:</span>
              <div className="flex items-center space-x-2">
                <span className="text-2xl">{value}</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClearIcon}
                  className="h-6 px-2 text-xs"
                >
                  Remove
                </Button>
              </div>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default IconPicker;