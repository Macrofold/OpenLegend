import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react';
import { Icon } from './components';

type SearchInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'children' | 'type'> & {
  children?: ReactNode;
  leading?: ReactNode;
  containerClassName?: string;
};

/** The shell owns the field treatment; callers retain search state and trailing controls. */
export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(function SearchInput(
  { children, leading, containerClassName, className, ...props },
  ref,
) {
  return (
    <div className={`ol-search${containerClassName ? ` ${containerClassName}` : ''}`}>
      {leading ?? <Icon name="ui.search" size={16} />}
      <input
        {...props}
        ref={ref}
        type="search"
        className={`ol-field-editor${className ? ` ${className}` : ''}`}
      />
      {children}
    </div>
  );
});
