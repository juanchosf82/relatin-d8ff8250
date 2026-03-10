
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import VisitasAdmin from "./VisitasAdmin";
import VisitPhotosAdmin from "./VisitPhotosAdmin";
import QualityIssuesAdmin from "./QualityIssuesAdmin";

interface Props { projectId: string }

const CalidadAdmin = ({ projectId }: Props) => {
  return (
    <Tabs defaultValue="visitas">
      <TabsList className="bg-white border border-gray-200 mb-4">
        <TabsTrigger value="visitas" className="text-[12px]">Visitas de Campo</TabsTrigger>
        <TabsTrigger value="fotos" className="text-[12px]">Fotos</TabsTrigger>
        <TabsTrigger value="issues" className="text-[12px]">Issues de Calidad</TabsTrigger>
      </TabsList>
      <TabsContent value="visitas"><VisitasAdmin projectId={projectId} /></TabsContent>
      <TabsContent value="fotos"><VisitPhotosAdmin projectId={projectId} /></TabsContent>
      <TabsContent value="issues"><QualityIssuesAdmin projectId={projectId} /></TabsContent>
    </Tabs>
  );
};

export default CalidadAdmin;
