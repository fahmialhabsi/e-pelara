import React from "react";
import ReadOnlyIndikatorPreview from "@/shared/components/steps/ReadOnlyIndikatorPreview";

const PreviewList = React.memo(({ data, opdOptions = [] }) => {
  if (!data.length)
    return <p className="text-muted">Belum ada indikator ditambahkan.</p>;

  const enhancedData = data
    .filter((item) => item && typeof item === "object")
    .map((item) => {
      const matchedOPD = opdOptions.find(
        (opt) => Number(opt.value) === Number(item.penanggung_jawab)
      );

      return {
        ...item,
        penanggung_jawab_label: matchedOPD ? matchedOPD.label : "-",
      };
    });

  return (
    <>
      {enhancedData.map((item, idx) => (
        <div key={idx} className="mb-4">
          <h6>Indikator {idx + 1}</h6>
          <ReadOnlyIndikatorPreview data={item} />
        </div>
      ))}
    </>
  );
});

export default PreviewList;
