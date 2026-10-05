import Svg, { Path } from "react-native-svg";
import type { IconProps } from "./types";

export default function OrdersIcon({
  color,
  filled = false,
  size = 24,
}: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M5.2 8h13.6a1 1 0 0 1 1 1.1l-1 10.5a1.5 1.5 0 0 1-1.5 1.4H6.7a1.5 1.5 0 0 1-1.5-1.4l-1-10.5A1 1 0 0 1 5.2 8z"
        fill={filled ? color : "none"}
        stroke={color}
        strokeWidth={1.8}
        strokeLinejoin="round"
      />
      <Path
        d="M8.5 8V7a3.5 3.5 0 0 1 7 0v1"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
      />
    </Svg>
  );
}
