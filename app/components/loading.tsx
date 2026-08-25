import { Loader2 } from "lucide-react";
import React  from "react";

const LoadingOverlay : React.FC = () => {
    return (
        /* make a spinner blue and center it */
        <div className="fixed top-0 left-0 w-full h-full flex items-center justify-center bg-opacity-10 bg-black/10 dark:bg-black/60">
            <Loader2 className=" h-30 w-30 animate-spin text-slate-700 dark:text-slate-200" />
        </div>
    );
};


export default LoadingOverlay;