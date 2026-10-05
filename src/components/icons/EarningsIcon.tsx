import Svg, { Circle, Path } from "react-native-svg";
import type { IconProps } from "./types";

const BODY =
  "M3 9a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3v8a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V9z";
const CLASP_HOLE = "M16.5 12.6a1.4 1.4 0 1 0 0 2.8 1.4 1.4 0 0 0 0-2.8z";

export default function EarningsIcon({
  color,
  filled = false,
  size = 24,
}: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {filled ? (
        <Path d={`${BODY} ${CLASP_HOLE}`} fill={color} fillRule="evenodd" />
      ) : (
        <>
          <Path
            d={BODY}
            stroke={color}
            strokeWidth={1.8}
            strokeLinejoin="round"
          />
          <Circle cx={16.5} cy={14} r={1.4} fill={color} />
        </>
      )}
      <Path
        d="M7 6V5.2A1.7 1.7 0 0 1 8.7 3.5H17"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
      />
    </Svg>
  );
}
