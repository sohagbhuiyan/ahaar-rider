import Svg, { Circle, Path } from "react-native-svg";
import type { IconProps } from "./types";

export default function ProfileIcon({
  color,
  filled = false,
  size = 24,
}: IconProps) {
  const fill = filled ? color : "none";
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle
        cx={12}
        cy={8}
        r={4}
        fill={fill}
        stroke={color}
        strokeWidth={1.8}
      />
      <Path
        d="M4.5 20.5a7.5 7.5 0 0 1 15 0z"
        fill={fill}
        stroke={color}
        strokeWidth={1.8}
        strokeLinejoin="round"
      />
    </Svg>
  );
}
