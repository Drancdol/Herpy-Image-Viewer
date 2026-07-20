import Svg, { Path } from 'react-native-svg';

export const IconXCircle = ({ size = 24, color = '#333' }) => (
  <Svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill={color}
    preserveAspectRatio="xMidYMid meet"
  >
    <Path d="M2.146 2.854a.5.5 0 1 1 .708-.708L8 7.293l5.146-5.147a.5.5 0 0 1 .708.708L8.707 8l5.147 5.146a.5.5 0 0 1-.708.708L8 8.707l-5.146 5.147a.5.5 0 0 1-.708-.708L7.293 8z" />
  </Svg>
);

// 使用
//<IconHome size={28} color="#f56c6c" />;
