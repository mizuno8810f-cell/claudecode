interface ClearScreenProps {
  title: string;
}

export function ClearScreen({ title }: ClearScreenProps) {
  return (
    <div className="clear-screen">
      <h1>GAME CLEAR</h1>
      <p>{title}</p>
    </div>
  );
}
