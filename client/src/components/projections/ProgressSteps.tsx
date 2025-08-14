import { cn } from "@/lib/utils";

interface ProgressStepsProps {
  steps: string[];
  currentStep: number;
  onStepClick?: (step: number) => void;
}

export default function ProgressSteps({
  steps,
  currentStep,
  onStepClick
}: ProgressStepsProps) {
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => (
          <div key={index} className="flex items-center relative">
            <button
              onClick={() => onStepClick && onStepClick(index)}
              className={cn(
                "rounded-full h-12 w-12 flex items-center justify-center border-4 z-10 transition-colors focus:outline-none",
                index < currentStep
                  ? "bg-secondary text-white border-secondary"
                  : index === currentStep
                  ? "bg-secondary text-white border-secondary"
                  : "bg-white text-slate-500 border-slate-200"
              )}
              disabled={!onStepClick}
            >
              {index + 1}
            </button>

            {/* Line connecting the steps */}
            {index < steps.length - 1 && (
              <>
                {/* Line to the right */}
                <div
                  className={cn(
                    "h-1 w-full absolute right-0 top-6 z-0",
                    index < currentStep ? "bg-secondary" : "bg-slate-200"
                  )}
                ></div>
              </>
            )}

            {/* Line to the left (except for the first step) */}
            {index > 0 && (
              <div
                className={cn(
                  "h-1 w-full absolute left-0 top-6 z-0",
                  index <= currentStep ? "bg-secondary" : "bg-slate-200"
                )}
              ></div>
            )}
          </div>
        ))}
      </div>

      {/* Step labels */}
      <div className="flex justify-between text-sm font-medium text-slate-600 mt-2">
        {steps.map((step, index) => (
          <div
            key={index}
            className={cn(
              "text-center w-full max-w-[100px] mx-auto",
              index === currentStep ? "text-secondary" : ""
            )}
          >
            {step}
          </div>
        ))}
      </div>
    </div>
  );
}
