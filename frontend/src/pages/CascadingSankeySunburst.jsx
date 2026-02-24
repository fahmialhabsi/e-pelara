import React, { useEffect, useState } from "react";
import { ResponsiveContainer } from "recharts";
import { Sankey } from "react-vis";
import { Sunburst } from "@nivo/sunburst";
import api from "../services/api";
import { Tabs, Tab, Card, Spinner } from "react-bootstrap";

export default function CascadingSankeySunburst() {
  const [sankeyData, setSankeyData] = useState({ nodes: [], links: [] });
  const [sunburstData, setSunburstData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const params = { jenis_dokumen: "rpjmd", tahun: 2025, limit: 9999 };
        const res = await api.get("/cascading", { params });
        const data = res.data?.data || [];

        const nodesMap = new Map();
        const nodes = [];
        const links = [];

        const addNode = (label) => {
          if (!label || typeof label !== "string") return null;
          if (!nodesMap.has(label)) {
            nodesMap.set(label, nodes.length);
            nodes.push({ name: label });
          }
          return nodesMap.get(label);
        };

        data.forEach((item) => {
          const path = [
            item.misi?.isi_misi,
            item.tujuan?.isi_tujuan,
            item.sasaran?.isi_sasaran,
            ...(item.strategis?.map((s) => s.deskripsi) || []),
            ...(item.arahKebijakans?.map((a) => a.deskripsi || a.nama_arah) ||
              []),
            item.program?.nama_program,
            item.kegiatan?.nama_kegiatan,
          ].filter(Boolean);

          for (let i = 0; i < path.length - 1; i++) {
            const source = addNode(path[i]);
            const target = addNode(path[i + 1]);
            if (source === null || target === null) continue;

            const existing = links.find(
              (l) => l.source === source && l.target === target
            );
            if (existing) existing.value += 1;
            else links.push({ source, target, value: 1 });
          }
        });

        setSankeyData({ nodes, links });

        // SUNBURST
        const flatPaths = data.map((item) =>
          [
            item.misi?.isi_misi,
            item.tujuan?.isi_tujuan,
            item.sasaran?.isi_sasaran,
            item.program?.nama_program,
            item.kegiatan?.nama_kegiatan,
          ].filter(Boolean)
        );

        const toHierarchy = (arr, level = 0) => {
          if (level >= arr[0]?.length) return null;
          const map = new Map();
          arr.forEach((item) => {
            const key = item[level];
            if (!map.has(key)) map.set(key, []);
            map.get(key).push(item);
          });
          return Array.from(map.entries()).map(([name, group]) => ({
            name,
            children: toHierarchy(group, level + 1) || undefined,
            value: group.length,
          }));
        };

        setSunburstData({ name: "RPJMD", children: toHierarchy(flatPaths) });
      } catch (error) {
        console.error("Gagal memuat data cascading", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) return <Spinner animation="border" className="mt-5" />;

  return (
    <Card className="p-4">
      <Tabs defaultActiveKey="sankey">
        <Tab eventKey="sankey" title="Sankey Diagram">
          <ResponsiveContainer width="100%" height={500}>
            <Sankey
              nodes={sankeyData.nodes}
              links={sankeyData.links}
              width={960}
              height={500}
              nodeWidth={15}
              nodePadding={10}
              layout={24}
            />
          </ResponsiveContainer>
        </Tab>
        <Tab eventKey="sunburst" title="Sunburst Diagram">
          <div style={{ height: 500 }}>
            <Sunburst
              data={sunburstData}
              margin={{ top: 10, right: 10, bottom: 10, left: 10 }}
              identity="name"
              value="value"
              cornerRadius={2}
              borderColor={{ theme: "background" }}
              colors={{ scheme: "set2" }}
              childColor={{ from: "color", modifiers: [["brighter", 0.2]] }}
              animate={true}
              isInteractive={true}
            />
          </div>
        </Tab>
      </Tabs>
    </Card>
  );
}
