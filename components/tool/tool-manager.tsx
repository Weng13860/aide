import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PackagePlus, Edit, Trash, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";

const toolFormSchema = z.object({
    toolName: z.string(),
    toolDescription: z.string(),
    functionName: z.string(),
    functionDescription: z.string(),
    functionParameters: z.string(), 
});


interface Tool {
    id: string;
    enabled: boolean;
    type: string;
    name: string;
    description: string;
    function: {
        name: string;
        description: string;
        parameters: {
            type: string;
            properties: Record<string, any>;
            required: string[];
        };
    };
}

interface ToolManagerProps {
    tools: Tool[];
    setTools: (tools: Tool[]) => void;
    isLoading: boolean;
    error: string;
}

export function ToolManager({ tools, setTools, isLoading, error }: ToolManagerProps) {
    const [editingTool, setEditingTool] = useState<Tool | null>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    const handleSaveTool = (tool: Tool) => {
        if (editingTool) {
            setTools(tools.map(t => t.function.name === editingTool.function.name ? tool : t));
        } else {
            setTools([...tools, tool]);
        }
        setIsDialogOpen(false);
        setEditingTool(null);
    };

    const handleDeleteTool = (toolName: string) => {
        setTools(tools.filter(t => t.function.name !== toolName));
    };

    return (
        <div className="flex flex-col relative h-[calc(97vh)] select-none">
            <div
                className="top-bar bg-gradient-to-b from-background/100 to-background/00"
                style={{
                    mask: "linear-gradient(black, black, transparent)",
                    backdropFilter: "blur(1px)",
                }}
            >
                <h2 className="text-2xl font-serif font-bold pl-2">Tools</h2>
                <Button
                    className="bg-transparent hover:bg-secondary custom-shadow transition-scale-zoom text-primary border border-border"
                    onClick={() => setIsDialogOpen(true)}
                >
                    <PackagePlus className="h-4 w-4" />
                    <span className="ml-2 hidden md:inline">New Tool</span>
                </Button>
            </div>

            <ScrollArea className="flex-grow">
                <AnimatePresence>
                    <motion.div className="space-y-2 mt-2">
                        {tools.map((tool) => (
                            <motion.div
                                key={tool.function.name}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                className="p-2 border custom-shadow rounded-md bg-background/50 hover:bg-background/80"
                            >
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h3 className="font-bold">{tool.name}</h3>
                                        <h3 className="font-bold">Testing</h3>
                                        <p className="text-sm text-muted-foreground">{tool.description}</p>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => {
                                                setEditingTool(tool);
                                                setIsDialogOpen(true);
                                            }}
                                        >
                                            <Edit className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleDeleteTool(tool.function.name)}
                                        >
                                            <Trash className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </motion.div>
                </AnimatePresence>
            </ScrollArea>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>
                            {editingTool ? "Edit Tool" : "Add New Tool"}
                        </DialogTitle>
                    </DialogHeader>
                    <ToolForm
                        initialTool={editingTool}
                        onSave={handleSaveTool}
                        onCancel={() => {
                            setIsDialogOpen(false);
                            setEditingTool(null);
                        }}
                    />
                </DialogContent>
            </Dialog>
        </div>
    );
}

function ToolForm({ initialTool, onSave, onCancel }: {
    initialTool: Tool | null;
    onSave: (tool: Tool) => void;
    onCancel: () => void;
}) {
    const [tool, setTool] = useState<Tool>(initialTool || {
        id: crypto.randomUUID(), // Generate a unique ID
        enabled: true,
        type: "function",
        name: "",
        description: "",
        function: {
            name: "",
            description: "",
            parameters: {
                type: "object",
                properties: {},
                required: []
            }
        }
    });

    const form = useForm<z.infer<typeof toolFormSchema>>({
        resolver: zodResolver(toolFormSchema),
        defaultValues: {
            toolName: "",
            toolDescription: "",
            functionName: "",
            functionDescription: "",
            functionParameters: JSON.stringify({
                type: "object",
                properties: {},
                required: []
            }, null, 2),
        },
    });

    function onSubmit(values: z.infer<typeof toolFormSchema>) {
        console.log(values);
    }

    return (
        <div className="space-y-2">
            <Form {... form}>
                <form onSubmit={form.handleSubmit(onSubmit)}>
                    <FormField
                        name="toolName"
                        control={form.control}
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel htmlFor="toolName">Tool Name</FormLabel>
                                <FormControl>
                                    <Input
                                        id="toolName"
                                        {...field}
                                    />
                                </FormControl>
                            </FormItem>
                            
                        )}
                    />
                    <FormField
                        name="toolDescription"
                        control={form.control}
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel htmlFor="toolDescription">Tool Description</FormLabel>
                                <FormControl>
                                    <Textarea
                                        id="toolDescription"
                                        {...field}
                                    />
                                </FormControl>
                            </FormItem>
                        )}
                    />
                    <FormField
                        name="functionName"
                        control={form.control}
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel htmlFor="functionName">Function Name</FormLabel>
                                <FormControl>
                                    <Input
                                        id="functionName"
                                        {...field}
                                    />
                                </FormControl>
                            </FormItem>
                        )}
                    />
                    <FormField
                        name="functionDescription"
                        control={form.control}
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel htmlFor="functionDescription">Function Description</FormLabel>
                                <FormControl>
                                    <Textarea
                                        id="functionDescription"
                                        {...field}
                                    />
                                </FormControl>
                            </FormItem>
                        )}
                    />
                    <FormField
                        name="functionParameters"
                        control={form.control}
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel htmlFor="functionParameters">Function Parameters</FormLabel>
                                <FormControl>
                                    <Textarea
                                        id="functionParameters"
                                        {...field}
                                    />
                                </FormControl>
                            </FormItem>
                        )}
                    />
                    <Button type="submit">Save</Button>
                </form>
            </Form>
        </div>
    );
}