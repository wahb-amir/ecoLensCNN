import ClientOnly from "../components/ClientWrapper";
import VerifyPage from "./verify";
const page = () => {
  return (
    <ClientOnly>
      <VerifyPage />
    </ClientOnly>
  );
};

export default page;
