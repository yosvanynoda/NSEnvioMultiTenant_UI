import React from 'react';
import HblCreate from './HblCreate';

export default function HblEdit({ hblType = 'aereo' }) {
  return <HblCreate hblType={hblType} editMode={true} />;
}
