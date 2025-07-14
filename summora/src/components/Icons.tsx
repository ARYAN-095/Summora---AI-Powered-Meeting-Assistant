import React from 'react';

interface IconProps extends React.SVGProps<SVGSVGElement> {
  path: string;
}

export const Icon = ({ path, className = "w-6 h-6", ...props }: IconProps) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className} {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d={path} />
    </svg>
);
