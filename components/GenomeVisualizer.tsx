import React from 'react';
import { Plant } from '../types';
import { YIELD_LOCI, RESISTANCE_LOCI, HEIGHT_LOCI, PLEIOTROPIC_YIELD_RESISTANCE, PLEIOTROPIC_HEIGHT_YIELD } from '../constants';

interface GenomeVisualizerProps {
  plant: Plant | null;
}

const GenomeVisualizer: React.FC<GenomeVisualizerProps> = ({ plant }) => {
  if (!plant) {
    return (
      <div className="h-full flex items-center justify-center text-gray-500 text-xs italic p-2">
        <div className="text-center">
          <p>🧬 Click a plant to view its genome</p>
          <p className="text-[10px] mt-1 text-gray-600">Diploid visualization with linkage</p>
        </div>
      </div>
    );
  }

  // Calculate heterozygosity percentage
  const hetCount = plant.genome.diploid ?
    plant.genome.diploid.filter(a => a.maternal !== a.paternal).length : 0;
  const hetPercent = plant.genome.diploid ?
    ((hetCount / plant.genome.diploid.length) * 100).toFixed(1) : '0';

  const renderLocus = (index: number) => {
    const val = plant.genome.loci[index];
    const diploid = plant.genome.diploid?.[index];

    const isYield = YIELD_LOCI.includes(index);
    const isRes = RESISTANCE_LOCI.includes(index);
    const isHeight = HEIGHT_LOCI.includes(index);
    const isPleiotropic = PLEIOTROPIC_YIELD_RESISTANCE.includes(index) || PLEIOTROPIC_HEIGHT_YIELD.includes(index);

    // Check heterozygosity
    const isHet = diploid ? diploid.maternal !== diploid.paternal : val === 1;

    // Determine colors
    let bgColor = 'bg-gray-700';
    let borderColor = 'border-gray-600';

    if (val === 2) { // AA - Homozygous dominant
      if (isYield) bgColor = 'bg-green-500';
      else if (isRes) bgColor = 'bg-yellow-500';
      else if (isHeight) bgColor = 'bg-blue-500';
    } else if (val === 1) { // Aa - Heterozygous
      if (isYield) bgColor = 'bg-green-700';
      else if (isRes) bgColor = 'bg-yellow-700';
      else if (isHeight) bgColor = 'bg-blue-700';
      borderColor = 'border-white/40';
    } else { // aa - Homozygous recessive
      bgColor = 'bg-gray-800';
    }

    // Pleiotropic loci get a special indicator
    const pleioRing = isPleiotropic ? 'ring-1 ring-purple-400' : '';

    return (
      <div
        key={index}
        className="flex flex-col items-center group relative"
        title={`Locus ${index}: ${val === 2 ? 'AA' : val === 1 ? 'Aa' : 'aa'}${isPleiotropic ? ' (Pleiotropic)' : ''}`}
      >
        {/* Diploid representation - two alleles side by side */}
        <div className="flex gap-px">
          <div
            className={`w-1.5 h-5 rounded-l-sm ${diploid?.maternal ? bgColor : 'bg-gray-800'} ${isHet ? borderColor : ''} border-r border-gray-900`}
          />
          <div
            className={`w-1.5 h-5 rounded-r-sm ${diploid?.paternal ? bgColor : 'bg-gray-800'} ${pleioRing}`}
          />
        </div>
      </div>
    );
  };

  // Group loci by chromosome/trait for visualization
  const chromosomes = [
    { name: 'Chr1 (Yield)', loci: YIELD_LOCI, color: 'text-green-400' },
    { name: 'Chr2 (Resistance)', loci: RESISTANCE_LOCI, color: 'text-yellow-400' },
    { name: 'Chr3 (Height)', loci: HEIGHT_LOCI, color: 'text-blue-400' },
  ];

  return (
    <div className="space-y-2 text-[10px]">
      {/* Header with ID and heterozygosity */}
      <div className="flex justify-between items-center bg-gray-800/50 px-2 py-1 rounded">
        <span className="font-mono text-gray-300">{plant.id}</span>
        <div className="flex gap-2">
          <span className={`px-1.5 py-0.5 rounded ${plant.isHeterozygous ? 'bg-purple-900/50 text-purple-300' : 'bg-gray-700 text-gray-400'}`}>
            Het: {hetPercent}%
          </span>
        </div>
      </div>

      {/* Diploid Genome Visualization */}
      <div className="bg-black/50 p-2 rounded">
        <p className="text-gray-500 text-[9px] mb-1 font-bold">DIPLOID GENOME (2n)</p>

        {chromosomes.map((chr, chrIdx) => (
          <div key={chr.name} className="mb-1.5">
            <div className="flex items-center gap-1 mb-0.5">
              <span className={`${chr.color} text-[8px] font-bold`}>{chr.name}</span>
              {chrIdx === 0 && <span className="text-purple-400 text-[7px]">↔ linkage</span>}
            </div>
            <div className="flex gap-0.5 justify-start">
              {chr.loci.map(idx => renderLocus(idx))}
            </div>
          </div>
        ))}
      </div>

      {/* Breeding Values (GEBV) */}
      <div className="bg-gray-800/30 p-2 rounded">
        <p className="text-gray-500 text-[9px] mb-1 font-bold">GENOMIC BREEDING VALUES (GEBV)</p>
        <div className="grid grid-cols-3 gap-1">
          <div className="bg-green-900/30 p-1.5 rounded text-center border border-green-700/30">
            <p className="text-green-400 font-bold">Yield</p>
            <p className="text-white text-sm font-mono">{plant.breedingValue.yield.toFixed(1)}</p>
            <p className="text-gray-500 text-[8px]">P: {plant.phenotype.yield.toFixed(1)}</p>
          </div>
          <div className="bg-yellow-900/30 p-1.5 rounded text-center border border-yellow-700/30">
            <p className="text-yellow-400 font-bold">Resist</p>
            <p className="text-white text-sm font-mono">{plant.breedingValue.resistance.toFixed(1)}</p>
            <p className="text-gray-500 text-[8px]">P: {plant.phenotype.resistance.toFixed(1)}</p>
          </div>
          <div className="bg-blue-900/30 p-1.5 rounded text-center border border-blue-700/30">
            <p className="text-blue-400 font-bold">Height</p>
            <p className="text-white text-sm font-mono">{plant.breedingValue.height.toFixed(1)}</p>
            <p className="text-gray-500 text-[8px]">P: {plant.phenotype.height.toFixed(1)}</p>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-2 gap-y-0.5 text-[8px] text-gray-500 justify-center">
        <span>◼ AA (dom)</span>
        <span>◼ Aa (het)</span>
        <span>◻ aa (rec)</span>
        <span className="text-purple-400">○ pleiotropic</span>
      </div>

      {/* Genetic Principle */}
      <div className="bg-purple-900/20 border border-purple-700/30 p-1.5 rounded text-[8px] text-purple-300">
        <p className="font-bold">📚 Linkage:</p>
        <p>• Loci 8-9: Yield ↔ Resistance trade-off</p>
        <p>• Loci 20-21: Height → Yield positive link</p>
      </div>
    </div>
  );
};

export default GenomeVisualizer;