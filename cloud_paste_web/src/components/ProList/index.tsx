import { Flex, List, type ListProps } from "antd";
import type { FC, ReactNode } from "react";

interface ProListProps<T = any> extends Omit<ListProps<T>, "header"> {
  header?: ReactNode;
  children?: ReactNode;
}

const ProList: FC<ProListProps> = (props) => {
  const { header, children, ...rest } = props;

  return (
    <Flex gap="small" vertical>
      {header && (
        <div className="font-medium text-base text-color-1">
          <span>{header}</span>
        </div>
      )}

      <List bordered {...rest}>
        {children}
      </List>
    </Flex>
  );
};

export default ProList;
