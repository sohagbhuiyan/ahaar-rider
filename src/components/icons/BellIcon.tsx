import Svg, { Path } from "react-native-svg";
import type { IconProps } from "./types";

export default function BellIcon({ color, filled = false, size = 24 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15L6 16z"
        fill={filled ? color : "none"}
        stroke={color}
        strokeWidth={1.8}
        strokeLinejoin="round"
      />
      <Path d="M10 20.5a2 2 0 0 0 4 0" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}
