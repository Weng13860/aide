"use client"

import * as React from "react"
import { Check, ChevronsUpDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Slider } from "@/components/ui/slider"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"

interface ModelParameters {
  model: string;
  supported_parameters: string[];
  max_output: number;
  [key: string]: any;
}

interface Model {
  id: string;
  name: string;
  parameters?: Partial<ModelParameters>;
}

interface SelectBaseModelProps {
  value: string;
  onValueChange: (value: string, parameters: Partial<ModelParameters>) => void;
  fetchAvailableModels: () => Promise<Model[]>;
  existingParameters?: Partial<ModelParameters>;
  fetchModelParameters: (modelId: string) => Promise<ModelParameters | null>;
}

export function SelectBaseModel({ value, onValueChange, fetchAvailableModels, existingParameters, fetchModelParameters }: SelectBaseModelProps) {
  const [open, setOpen] = React.useState(false);
  const [parameters, setParameters] = React.useState<ModelParameters | null>(null);
  const [availableModels, setAvailableModels] = React.useState<Model[]>([]);
  const [cachedParameters, setCachedParameters] = React.useState<Record<string, ModelParameters>>({});

  React.useEffect(() => {
    const loadModels = async () => {
      const models = await fetchAvailableModels();
      setAvailableModels(models);
    };
    loadModels();
  }, [fetchAvailableModels]);

  const fetchModelParametersWithCache = React.useCallback(async (modelId: string) => {
    if (cachedParameters[modelId]) {
      setParameters(cachedParameters[modelId]);
      return cachedParameters[modelId];
    }
    if (cachedParameters[modelId]) {
      console.log("Using cached parameters for model:", modelId, cachedParameters[modelId]);
      setParameters(cachedParameters[modelId]);
      return cachedParameters[modelId];
    }

    try {
      // console.log("Fetching parameters for model:", modelId);
      const data = await fetchModelParameters(modelId);
      // console.log("Received parameters:", data);
      if (data) {
        setParameters(data.data);
        setCachedParameters(prev => ({ ...prev, [modelId]: data.data }));
      }
      return data?.data;
    } catch (error) {
      console.error('Error fetching model parameters:', error);
      setParameters(null);
      return null;
    }
  }, [cachedParameters, fetchModelParameters]);

  React.useEffect(() => {
    if (value) {
      if (existingParameters && Object.keys(existingParameters).length > 0) {
        setParameters(existingParameters as ModelParameters);
      } else {
        fetchModelParametersWithCache(value);
      }
    }
  }, [value, fetchModelParametersWithCache, existingParameters]);

  const handleParameterChange = (param: string, newValue: any) => {
    if (parameters) {
      const updatedParameters = { ...parameters, [param]: newValue };
      setParameters(updatedParameters);
      onValueChange(value, updatedParameters);
    }
  };

  const renderParameter = (param: string) => {
    const value = parameters?.[param];
    let min = 0;
    let max = 1;
    let step = 0.01;

    switch (param) {
      case 'temperature':
        max = 2.0;
        break;
      case 'top_p':
        break;
      case 'top_k':
        max = Number.MAX_SAFE_INTEGER;
        step = 1;
        break;
      case 'frequency_penalty':
      case 'presence_penalty':
        min = -2.0;
        max = 2.0;
        break;
      case 'repetition_penalty':
        max = 2.0;
        break;
      case 'min_p':
      case 'top_a':
      case 'seed':
      case 'max_tokens':
        min = 1;
        max = parameters?.max_output || 4096;
        step = 1;
        break;
      case 'top_logprobs':
        min = 1;
        max = 20;
        step = 1;
        break;
      case 'logit_bias':
      case 'response_format':
      case 'stop':
      case 'tools':
      case 'tool_choice':
      case 'logprobs':
        // These parameters don't use min/max/step
        break;
      default:
        console.warn(`Unknown parameter: ${param}`);
        return null;
    }

    switch (param) {
      case 'temperature':
      case 'top_p':
      case 'top_k':
      case 'frequency_penalty':
      case 'presence_penalty':
      case 'repetition_penalty':
      case 'min_p':
      case 'top_a':
      case 'seed':
        return (
          <div key={param} className="flex flex-col space-y-2">
            <div className="flex items-center justify-between">
              <Label>{param}</Label>
              <Input
                type="number"
                value={value || 0}
                onChange={(e) => handleParameterChange(param, parseFloat(e.target.value))}
                className="min-font-size text-foreground p-1 ml-2 w-flex h-6 text-right text-xs"
                step={step.toString()}
                min={min}
                max={max}
              />
            </div>
            <Slider
              defaultValue={[value || 0]}
              max={max}
              min={min}
              step={step}
              value={[value || 0]}
              onValueChange={([val]) => handleParameterChange(param, val)}
              className="h-4"
            />
          </div>
        );
      case 'max_tokens':
        return (
          <div key={param} className="flex flex-col space-y-2">
            <div className="flex items-center justify-between">
              <Label>{param}</Label>
              <Input
                type="number"
                value={value || 0}
                onChange={(e) => handleParameterChange(param, Math.min(parseInt(e.target.value), max))}
                className="min-font-size text-foreground p-1 ml-2 w-full h-6 text-right text-xs"
                step={step.toString()}
                min={min}
                max={max}
              />
            </div>
            <Slider
              defaultValue={[value || 0]}
              max={max}
              min={min}
              step={step}
              value={[value || 0]}
              onValueChange={([val]) => handleParameterChange(param, val)}
              className="h-4"
            />
          </div>
        );
      case 'logit_bias':
      case 'response_format':
      case 'stop':
      case 'tools':
      case 'tool_choice':
        return (
          <div key={param} className="flex flex-col space-y-2">
            <Label>{param}</Label>
            <Input
              type="text"
              value={typeof value === 'object' ? JSON.stringify(value) : value}
              onChange={(e) => {
                try {
                  const parsedValue = JSON.parse(e.target.value);
                  handleParameterChange(param, parsedValue);
                } catch (error) {
                  handleParameterChange(param, e.target.value);
                }
              }}
              placeholder={`Enter ${param} as JSON or string`}
            />
          </div>
        );
      case 'logprobs':
        return (
          <div key={param} className="flex items-center space-x-2">
            <Switch
              id={`${param}-switch`}
              checked={value === true}
              onCheckedChange={(checked) => handleParameterChange(param, checked)}
            />
            <Label htmlFor={`${param}-switch`}>{param}</Label>
          </div>
        );
      case 'top_logprobs':
        return (
          <div key={param} className="flex flex-col space-y-2">
            <Label>{param}</Label>
            <Input
              type="number"
              value={value || 0}
              onChange={(e) => handleParameterChange(param, parseInt(e.target.value))}
              min={0}
              max={20}
            />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
          >
            {value ? (
              <span className="truncate">{availableModels.find(model => model.id === value)?.name || value}</span>
            ) : "Select model..."}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0">
          <Command>
            <CommandInput placeholder="Search model..." />
            <CommandList>
              <CommandEmpty>No model found.</CommandEmpty>
              <CommandGroup>
                {availableModels.map((model) => (
                  <CommandItem
                    key={model.id}
                    value={model.id}
                    onSelect={async (currentValue) => {
                      const newParameters = await fetchModelParametersWithCache(currentValue);
                      if (newParameters) {
                        const modelWithMaxOutput = availableModels.find(m => m.id === currentValue);
                        if (modelWithMaxOutput && modelWithMaxOutput.parameters?.max_output) {
                          newParameters.max_output = modelWithMaxOutput.parameters.max_output;
                        }
                        onValueChange(currentValue, newParameters);
                        setOpen(false);
                      }
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === model.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {model.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {parameters && (
        <div className="space-y-4">
          {parameters.supported_parameters?.map(renderParameter) || null}
        </div>
      )}
    </div>
  );
}