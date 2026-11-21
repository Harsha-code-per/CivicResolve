import type { ReactElement } from 'react';

/** Block map: digits are building heights, "." is open ground, "t" a park. */
const CITY = ['42.3t15', '2564.31', '.t3.62t', '351t.43', '2.6324t', '14t.253', '3t2516.'];

/** Buildings that carry a report pin, keyed "row-col". Pins cycle Reported → Resolved. */
const PINS: Readonly<Record<string, number>> = {
  '0-1': 1,
  '1-2': 2,
  '2-5': 3,
  '3-1': 4,
  '4-3': 5,
  '5-4': 6,
  '6-3': 7,
};

/**
 * One block of the city: a 3D building (roof plus two walls), a park, or open ground.
 *
 * @param props - Map cell and its grid position.
 * @returns Tile element.
 */
function Tile({ cell, id }: { readonly cell: string; readonly id: string }): ReactElement {
  if (cell === '.') return <div className="tile tile-open" />;
  if (cell === 't') {
    return (
      <div className="tile tile-park">
        <span className="tree" />
      </div>
    );
  }
  const pin = PINS[id];
  return (
    <div className="tile">
      <div className={`bld h${cell}`}>
        <i className="face roof" />
        <i className="face wall-front" />
        <i className="face wall-side" />
        {pin !== undefined && (
          <span className={`pin pin-d${String(pin)}`}>
            <span className="pin-ring" />
            <span className="pin-head" />
          </span>
        )}
      </div>
    </div>
  );
}

/**
 * A small isometric city rendered with CSS 3D transforms (no WebGL, no images).
 * Report pins rise over buildings and change colour as their issues move from
 * Reported to In Progress to Resolved. Purely decorative, so hidden from
 * assistive technology; motion stops under prefers-reduced-motion.
 *
 * @returns Decorative 3D scene.
 */
export function CityScene(): ReactElement {
  return (
    <div className="city" aria-hidden="true">
      <div className="city-stage">
        <div className="city-grid">
          {CITY.flatMap((row, r) =>
            Array.from({ length: row.length }, (_, c) => {
              const cell = row.charAt(c);
              const id = `${String(r)}-${String(c)}`;
              return <Tile key={id} cell={cell} id={id} />;
            }),
          )}
        </div>
      </div>
    </div>
  );
}
