import clsx from 'clsx';

interface Props {
  className?: string;
  count?: number;
}

export default function Skeleton({ className, count = 1 }: Props) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={clsx('skeleton rounded-xl', className)}
        />
      ))}
    </>
  );
}
