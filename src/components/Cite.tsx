export default function Cite({ n }: { n: number | number[] }) {
  const nums = Array.isArray(n) ? n : [n];

  return (
    <sup className="ml-0.5 whitespace-nowrap text-[0.72em] font-semibold leading-none">
      [
      {nums.map((num, i) => (
        <span key={num}>
          {i > 0 ? "," : null}
          <a href={`#ref-${num}`} title={`查看参考资料 ${num}`} className="!no-underline">
            {num}
          </a>
        </span>
      ))}
      ]
    </sup>
  );
}
